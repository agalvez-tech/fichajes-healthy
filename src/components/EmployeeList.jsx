import { EMPRESAS, empleadosDeEmpresa } from '../data'

export default function EmployeeList({ empresaId, estados, onBack, onSelectEmployee }) {
  const empresa = EMPRESAS.find((e) => e.id === empresaId)
  const empleados = empleadosDeEmpresa(empresaId)

  return (
    <div className="screen">
      <div className="employee-header">
        <div>
          <h1 className="page-title">{empresa?.nombre}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Selecciona tu nombre para fichar.
          </p>
        </div>
        <button className="btn ghost" onClick={onBack}>
          ← Cambiar empresa
        </button>
      </div>

      <div className="card-grid">
        {empleados.map((emp) => {
          const enCurso = estados[emp.id]?.enCurso
          return (
            <button key={emp.id} className="card" onClick={() => onSelectEmployee(emp.id)}>
              <div className="eyebrow">{emp.categoria || 'Empleado/a'}</div>
              <div className="title">{emp.nombre}</div>
              {emp.puesto && <div className="puesto">{emp.puesto}</div>}
              <div className="meta">
                Horario {emp.horario.entrada}–{emp.horario.salida}
              </div>
              <div style={{ marginTop: 12 }}>
                <span className={`stamp ${enCurso ? 'on' : 'off'}`}>
                  {enCurso ? 'En turno' : 'Fuera de turno'}
                </span>
              </div>
            </button>
          )
        })}
        {empleados.length === 0 && (
          <p className="empty-state">Todavía no hay empleados dados de alta en esta empresa.</p>
        )}
      </div>
    </div>
  )
}
