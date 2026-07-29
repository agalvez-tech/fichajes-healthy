import { useMemo, useState } from 'react'
import { EMPRESAS, EMPLEADOS, GERENCIA } from '../data'
import { DIAS_VACACIONES_ANUALES, diasSolicitadosEnAnio } from '../lib/vacaciones'
import { generarInformePDF } from '../pdf'

function nombreEmpleado(id) {
  return EMPLEADOS.find((e) => e.id === id)?.nombre || id
}
function dniEmpleado(id) {
  return EMPLEADOS.find((e) => e.id === id)?.dni || ''
}

export default function AdminPanel({ db, busy, onBack, onResolverVacaciones }) {
  const [tab, setTab] = useState('vacaciones')
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas')
  const [filtroEmpleado, setFiltroEmpleado] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const pendientes = db.vacaciones
    .filter((v) => v.estado === 'pendiente')
    .sort((a, b) => (a.fechaSolicitud < b.fechaSolicitud ? 1 : -1))
  const historicoVacaciones = db.vacaciones
    .filter((v) => v.estado !== 'pendiente')
    .sort((a, b) => (a.fechaResolucion < b.fechaResolucion ? 1 : -1))

  const enTurnoAhora = Object.entries(db.estados).filter(([, v]) => v?.enCurso).length
  const enPausaAhora = Object.entries(db.estados).filter(([, v]) => v?.enCurso && v?.enPausa).length
  const anioActual = new Date().getFullYear()

  const empleadosFiltrados =
    filtroEmpresa === 'todas' ? EMPLEADOS : EMPLEADOS.filter((e) => e.empresaId === filtroEmpresa)

  const fichajesFiltrados = useMemo(() => {
    return db.fichajes
      .filter((f) => (filtroEmpresa === 'todas' ? true : f.empresaId === filtroEmpresa))
      .filter((f) => (filtroEmpleado === 'todos' ? true : f.employeeId === filtroEmpleado))
      .filter((f) => (desde ? f.fecha >= desde : true))
      .filter((f) => (hasta ? f.fecha <= hasta : true))
      .sort((a, b) => (a.fecha + a.horaEntrada < b.fecha + b.horaEntrada ? 1 : -1))
  }, [db.fichajes, filtroEmpresa, filtroEmpleado, desde, hasta])

  const exportarPDF = () => {
    const empresa = filtroEmpresa === 'todas' ? null : EMPRESAS.find((e) => e.id === filtroEmpresa)
    const titulo =
      filtroEmpleado === 'todos'
        ? 'Resumen de fichajes'
        : `Resumen de fichajes · ${nombreEmpleado(filtroEmpleado)}`
    const rows = fichajesFiltrados.map((f) => ({
      empleadoNombre: nombreEmpleado(f.employeeId),
      dni: dniEmpleado(f.employeeId),
      fecha: f.fecha,
      horaEntrada: f.horaEntrada,
      pausas: f.pausas,
      horaSalida: f.horaSalida,
      horasTrabajadas: f.horasTrabajadas,
    }))
    const doc = generarInformePDF({
      empresa,
      rango: desde || hasta ? { desde: desde || '—', hasta: hasta || '—' } : null,
      rows,
      tituloEmpleado: titulo,
    })
    const nombreArchivo = `healthymeat-fichajes-${filtroEmpleado === 'todos' ? 'equipo' : filtroEmpleado}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
    doc.save(nombreArchivo)
  }

  return (
    <div className="screen">
      <div className="employee-header">
        <div>
          <h1 className="page-title">Gerencia</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {GERENCIA.nombre} · vacaciones, fichajes e informes
          </p>
        </div>
        <button className="btn ghost" onClick={onBack}>
          ← Salir
        </button>
      </div>

      <div className="summary-strip">
        <div className="summary-item">
          <div className="num">{enTurnoAhora}</div>
          <div className="label">En turno ahora</div>
        </div>
        <div className="summary-item">
          <div className="num">{enPausaAhora}</div>
          <div className="label">En pausa ahora</div>
        </div>
        <div className="summary-item">
          <div className="num">{pendientes.length}</div>
          <div className="label">Vacaciones pendientes</div>
        </div>
        <div className="summary-item">
          <div className="num">{EMPLEADOS.length}</div>
          <div className="label">Empleados</div>
        </div>
        <div className="summary-item">
          <div className="num">{EMPRESAS.length}</div>
          <div className="label">Empresas</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'vacaciones' ? 'active' : ''}`} onClick={() => setTab('vacaciones')}>
          Vacaciones
        </button>
        <button className={`tab ${tab === 'fichajes' ? 'active' : ''}`} onClick={() => setTab('fichajes')}>
          Fichajes e informes
        </button>
      </div>

      {tab === 'vacaciones' && (
        <>
          <div className="panel">
            <h3>Saldo de vacaciones {anioActual}</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Empresa</th>
                    <th>Pedidos</th>
                    <th>Quedan</th>
                  </tr>
                </thead>
                <tbody>
                  {EMPLEADOS.map((emp) => {
                    const usados = diasSolicitadosEnAnio(db.vacaciones, emp.id, anioActual)
                    return (
                      <tr key={emp.id}>
                        <td>{emp.nombre}</td>
                        <td>{EMPRESAS.find((e) => e.id === emp.empresaId)?.nombre}</td>
                        <td>{usados} / {DIAS_VACACIONES_ANUALES}</td>
                        <td>{Math.max(0, DIAS_VACACIONES_ANUALES - usados)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h3>Pendientes de aprobar</h3>
            {pendientes.length === 0 ? (
              <p className="empty-state">No hay solicitudes pendientes.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Periodo</th>
                      <th>Motivo</th>
                      <th>Solicitada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map((v) => (
                      <tr key={v.id}>
                        <td>{nombreEmpleado(v.employeeId)}</td>
                        <td>
                          {formatearFecha(v.fechaInicio)} – {formatearFecha(v.fechaFin)}
                        </td>
                        <td>{v.motivo || '—'}</td>
                        <td>{formatearFecha(v.fechaSolicitud)}</td>
                        <td>
                          <div className="row">
                            <button
                              className="btn gold"
                              disabled={busy}
                              onClick={() => onResolverVacaciones(v.id, 'aprobada')}
                            >
                              Aprobar
                            </button>
                            <button
                              className="btn danger"
                              disabled={busy}
                              onClick={() => onResolverVacaciones(v.id, 'rechazada')}
                            >
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Historial</h3>
            {historicoVacaciones.length === 0 ? (
              <p className="empty-state">Todavía no hay solicitudes resueltas.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Periodo</th>
                      <th>Estado</th>
                      <th>Resuelta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoVacaciones.map((v) => (
                      <tr key={v.id}>
                        <td>{nombreEmpleado(v.employeeId)}</td>
                        <td>
                          {formatearFecha(v.fechaInicio)} – {formatearFecha(v.fechaFin)}
                        </td>
                        <td>
                          <span className={`stamp ${v.estado}`}>
                            {v.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                          </span>
                        </td>
                        <td>{formatearFecha(v.fechaResolucion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'fichajes' && (
        <>
          <div className="panel">
            <h3>Filtros</h3>
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 180 }}>
                <label>Empresa</label>
                <select
                  value={filtroEmpresa}
                  onChange={(e) => {
                    setFiltroEmpresa(e.target.value)
                    setFiltroEmpleado('todos')
                  }}
                >
                  <option value="todas">Todas las empresas</option>
                  {EMPRESAS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 180 }}>
                <label>Empleado</label>
                <select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)}>
                  <option value="todos">Todos</option>
                  {empleadosFiltrados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 140 }}>
                <label>Desde</label>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 140 }}>
                <label>Hasta</label>
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
            </div>
            <button className="btn gold" onClick={exportarPDF} disabled={fichajesFiltrados.length === 0}>
              Generar PDF ({fichajesFiltrados.length} registros)
            </button>
          </div>

          <div className="panel">
            <h3>Registros</h3>
            {fichajesFiltrados.length === 0 ? (
              <p className="empty-state">No hay fichajes con estos filtros.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Pausa</th>
                      <th>Salida</th>
                      <th>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichajesFiltrados.map((f) => (
                      <tr key={f.id}>
                        <td>{nombreEmpleado(f.employeeId)}</td>
                        <td>{formatearFecha(f.fecha)}</td>
                        <td>{f.horaEntrada}</td>
                        <td>{formatearPausas(f.pausas)}</td>
                        <td>{f.horaSalida || 'En curso'}</td>
                        <td>{f.horasTrabajadas != null ? `${f.horasTrabajadas.toFixed(2)} h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function formatearFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatearPausas(pausas) {
  if (!pausas || pausas.length === 0) return '—'
  return pausas.map((p) => `${p.inicio}–${p.fin || '…'}`).join(', ')
}
