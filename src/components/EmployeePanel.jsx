import { Fragment, useEffect, useMemo, useState } from 'react'
import { EMPLEADOS, empresaDe } from '../data'
import { DIAS_VACACIONES_ANUALES, contarDiasLaborables, diasSolicitadosEnAnio } from '../lib/vacaciones'

function useRelojMadrid() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function EmployeePanel({
  employeeId,
  db,
  busy,
  onBack,
  onFicharEntrada,
  onFicharSalida,
  onFicharPausaInicio,
  onFicharPausaFin,
  onSolicitarVacaciones,
  onSolicitarCorreccion,
}) {
  const empleado = EMPLEADOS.find((e) => e.id === employeeId)
  const empresa = empresaDe(empleado)
  const now = useRelojMadrid()
  const [showForm, setShowForm] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [formError, setFormError] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [editEntrada, setEditEntrada] = useState('')
  const [editSalida, setEditSalida] = useState('')
  const [editMotivo, setEditMotivo] = useState('')
  const [editError, setEditError] = useState('')

  const misCorrecciones = (db.correcciones || []).filter((c) => c.employeeId === employeeId)
  const correccionPendientePara = (fichajeId) =>
    misCorrecciones.find((c) => c.fichajeId === fichajeId && c.estado === 'pendiente')

  const abrirEdicion = (f) => {
    setEditandoId(f.id)
    setEditEntrada(f.horaEntrada)
    setEditSalida(f.horaSalida)
    setEditMotivo('')
    setEditError('')
  }

  const enviarCorreccion = (e, fichajeId) => {
    e.preventDefault()
    setEditError('')
    if (!editEntrada || !editSalida) return
    if (editSalida <= editEntrada) {
      setEditError('La salida tiene que ser posterior a la entrada.')
      return
    }
    onSolicitarCorreccion({
      fichajeId,
      horaEntrada: editEntrada,
      horaSalida: editSalida,
      motivo: editMotivo,
    })
    setEditandoId(null)
  }


  const estado = db.estados[employeeId] || {}
  const enCurso = estado.enCurso
  const enPausa = estado.enPausa
  const misFichajes = db.fichajes
    .filter((f) => f.employeeId === employeeId)
    .sort((a, b) => (a.fecha + a.horaEntrada < b.fecha + b.horaEntrada ? 1 : -1))
  const misVacaciones = db.vacaciones
    .filter((v) => v.employeeId === employeeId)
    .sort((a, b) => (a.fechaSolicitud < b.fechaSolicitud ? 1 : -1))

  const fichajeActual = enCurso ? misFichajes.find((f) => f.id === estado.fichajeId) : null

  const anioActual = new Date().getFullYear()
  const diasUsados = useMemo(
    () => diasSolicitadosEnAnio(db.vacaciones, employeeId, anioActual),
    [db.vacaciones, employeeId, anioActual]
  )
  const diasRestantes = Math.max(0, DIAS_VACACIONES_ANUALES - diasUsados)
  const diasEstaSolicitud = contarDiasLaborables(fechaInicio, fechaFin)

  const horaTexto = now.toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const fechaTexto = now.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const enviarVacaciones = (e) => {
    e.preventDefault()
    setFormError('')
    if (!fechaInicio || !fechaFin) return
    if (diasEstaSolicitud <= 0) {
      setFormError('El rango elegido no incluye ningún día laborable (lunes a viernes).')
      return
    }
    if (diasUsados + diasEstaSolicitud > DIAS_VACACIONES_ANUALES) {
      setFormError(
        `Solo te quedan ${diasRestantes} día(s) laborable(s) de vacaciones en ${anioActual}. Esta solicitud son ${diasEstaSolicitud}.`
      )
      return
    }
    onSolicitarVacaciones({ fechaInicio, fechaFin, motivo })
    setShowForm(false)
    setFechaInicio('')
    setFechaFin('')
    setMotivo('')
  }

  return (
    <div className="screen">
      <div className="employee-header">
        <div>
          <h1 className="page-title">{empleado?.nombre}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {empresa?.nombre} {empleado?.puesto ? `· ${empleado.puesto}` : ''} · Horario {empleado?.horario.entrada}–{empleado?.horario.salida}
          </p>
        </div>
        <button className="btn ghost" onClick={onBack}>
          ← Volver
        </button>
      </div>

      <div className="clock-card">
        <div className="clock-time">{horaTexto}</div>
        <div className="clock-date">{fechaTexto}</div>

        {!enCurso && (
          <>
            <button
              className="big-clock-btn entrada"
              disabled={busy}
              onClick={() => onFicharEntrada(empleado.horario.entrada)}
            >
              Fichar entrada
            </button>
            <p className="hint">Tu horario habitual es de {empleado?.horario.entrada} a {empleado?.horario.salida}</p>
          </>
        )}

        {enCurso && !enPausa && (
          <>
            <button
              className="big-clock-btn salida"
              disabled={busy}
              onClick={() => onFicharSalida(empleado.horario.salida)}
            >
              Fichar salida
            </button>
            <div style={{ marginTop: 14 }}>
              <button className="btn" disabled={busy} onClick={onFicharPausaInicio}>
                Fichar inicio de pausa / almuerzo
              </button>
            </div>
            <p className="hint">Entrada registrada a las {fichajeActual?.horaEntrada || '—'}</p>
          </>
        )}

        {enCurso && enPausa && (
          <>
            <button className="big-clock-btn entrada" disabled={busy} onClick={onFicharPausaFin}>
              Fichar fin de pausa
            </button>
            <p className="hint">
              Estás en pausa desde las{' '}
              {[...(fichajeActual?.pausas || [])].reverse().find((p) => !p.fin)?.inicio || '—'}. Ficha el
              fin de la pausa para poder fichar la salida.
            </p>
          </>
        )}
      </div>

      <div className="panel">
        <h3>Últimos fichajes</h3>
        {misFichajes.length === 0 ? (
          <p className="empty-state">Todavía no tienes fichajes registrados.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Pausa</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {misFichajes.slice(0, 8).map((f) => {
                  const pendiente = correccionPendientePara(f.id)
                  return (
                    <Fragment key={f.id}>
                      <tr>
                        <td>
                          {formatearFecha(f.fecha)}
                          {f.corregido && <span className="hint" style={{ display: 'block' }}>Corregido</span>}
                        </td>
                        <td>{f.horaEntrada}</td>
                        <td>{formatearPausas(f.pausas)}</td>
                        <td>{f.horaSalida || 'En curso'}</td>
                        <td>{f.horasTrabajadas != null ? `${f.horasTrabajadas.toFixed(2)} h` : '—'}</td>
                        <td>
                          {pendiente ? (
                            <span className="stamp pending">Corrección pendiente</span>
                          ) : f.horaSalida ? (
                            <button className="link-btn" onClick={() => abrirEdicion(f)}>
                              Editar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      {editandoId === f.id && (
                        <tr key={`${f.id}-edit`}>
                          <td colSpan={6}>
                            <form
                              onSubmit={(e) => enviarCorreccion(e, f.id)}
                              style={{ padding: '8px 0' }}
                            >
                              <p className="hint" style={{ marginTop: 0 }}>
                                Pides que gerencia corrija este fichaje. Se quedará como está hasta que lo
                                apruebe.
                              </p>
                              <div className="row">
                                <div className="field" style={{ flex: 1, minWidth: 120 }}>
                                  <label>Entrada</label>
                                  <input
                                    type="time"
                                    value={editEntrada}
                                    onChange={(e) => setEditEntrada(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="field" style={{ flex: 1, minWidth: 120 }}>
                                  <label>Salida</label>
                                  <input
                                    type="time"
                                    value={editSalida}
                                    onChange={(e) => setEditSalida(e.target.value)}
                                    required
                                  />
                                </div>
                              </div>
                              <div className="field">
                                <label>Motivo (opcional)</label>
                                <input
                                  type="text"
                                  value={editMotivo}
                                  onChange={(e) => setEditMotivo(e.target.value)}
                                  placeholder="Ej. se me olvidó fichar la salida a la hora real"
                                />
                              </div>
                              {editError && (
                                <p className="pin-error" style={{ textAlign: 'left' }}>
                                  {editError}
                                </p>
                              )}
                              <div className="row">
                                <button className="btn gold" type="submit" disabled={busy}>
                                  Enviar a gerencia
                                </button>
                                <button
                                  type="button"
                                  className="btn ghost"
                                  onClick={() => setEditandoId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="employee-header" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Vacaciones</h3>
          <button className="btn gold" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancelar' : 'Solicitar vacaciones'}
          </button>
        </div>
        <p className="hint" style={{ marginTop: 0, marginBottom: 20 }}>
          Has pedido {diasUsados} de {DIAS_VACACIONES_ANUALES} días laborables en {anioActual} · te quedan{' '}
          {diasRestantes}.
        </p>

        {showForm && (
          <form onSubmit={enviarVacaciones} style={{ marginBottom: 20 }}>
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Desde</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>
            {fechaInicio && fechaFin && (
              <p className="hint" style={{ marginTop: -8 }}>
                Son {diasEstaSolicitud} día(s) laborable(s).
              </p>
            )}
            <div className="field">
              <label>Motivo (opcional)</label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            {formError && (
              <p className="pin-error" style={{ textAlign: 'left', marginBottom: 8 }}>
                {formError}
              </p>
            )}
            <button className="btn gold block" type="submit" disabled={busy}>
              Enviar solicitud a gerencia
            </button>
          </form>
        )}

        {misVacaciones.length === 0 ? (
          <p className="empty-state">No has solicitado vacaciones todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {misVacaciones.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {formatearFecha(v.fechaInicio)} – {formatearFecha(v.fechaFin)}
                    </td>
                    <td>{v.motivo || '—'}</td>
                    <td>
                      <span className={`stamp ${v.estado}`}>{etiquetaEstado(v.estado)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function formatearFecha(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatearPausas(pausas) {
  if (!pausas || pausas.length === 0) return '—'
  return pausas.map((p) => `${p.inicio}–${p.fin || '…'}`).join(', ')
}

function etiquetaEstado(estado) {
  if (estado === 'aprobada') return 'Aprobada'
  if (estado === 'rechazada') return 'Rechazada'
  return 'Pendiente'
}
