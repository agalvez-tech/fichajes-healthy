import { EMPRESAS, EMPLEADOS } from '../data'

export default function Home({ onSelectEmpresa, onGerencia }) {
  return (
    <div className="screen">
      <div style={{ textAlign: 'center', margin: '12px 0 32px' }}>
        <img
          src="/logo.jpg"
          alt="HealthyMeat"
          style={{
            width: 108,
            height: 108,
            borderRadius: '50%',
            border: '1px solid var(--line)',
            objectFit: 'cover',
          }}
        />
      </div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>
        Fichajes
      </h1>
      <p className="page-subtitle" style={{ textAlign: 'center' }}>
        Elige tu empresa para fichar o solicitar vacaciones.
      </p>

      <div className="card-grid">
        {EMPRESAS.map((emp) => {
          const nEmpleados = EMPLEADOS.filter((e) => e.empresaId === emp.id).length
          return (
            <button key={emp.id} className="card" onClick={() => onSelectEmpresa(emp.id)}>
              <div className="eyebrow">Empresa</div>
              <div className="title">{emp.nombre}</div>
              <div className="meta">
                {nEmpleados} empleado{nEmpleados === 1 ? '' : 's'} · {emp.poblacion}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <button className="link-btn" onClick={onGerencia}>
          Acceso gerencia
        </button>
      </div>
    </div>
  )
}
