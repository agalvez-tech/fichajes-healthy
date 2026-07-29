import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Home from './components/Home'
import EmployeeList from './components/EmployeeList'
import EmployeeLogin from './components/EmployeeLogin'
import EmployeePanel from './components/EmployeePanel'
import AdminLogin from './components/AdminLogin'
import AdminPanel from './components/AdminPanel'
import Toast from './components/Toast'

const emptyDb = { fichajes: [], vacaciones: [], estados: {} }

export default function App() {
  const [screen, setScreen] = useState('home') // home | employees | employee-pin | employee | admin-login | admin
  const [empresaId, setEmpresaId] = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [db, setDb] = useState(emptyDb)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await api.getAll()
      setDb({ fichajes: data.fichajes || [], vacaciones: data.vacaciones || [], estados: data.estados || {} })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  }, [refresh])

  const ficharEntrada = async (horarioEntrada) => {
    setBusy(true)
    try {
      await api.ficharEntrada(employeeId, empresaId, horarioEntrada)
      await refresh()
      showToast('Entrada registrada. ¡Buen turno!')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const ficharSalida = async (horarioSalida) => {
    setBusy(true)
    try {
      await api.ficharSalida(employeeId, horarioSalida)
      await refresh()
      showToast('Salida registrada. Hasta pronto.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const ficharPausaInicio = async () => {
    setBusy(true)
    try {
      await api.ficharPausaInicio(employeeId)
      await refresh()
      showToast('Pausa iniciada. Que aproveche.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const ficharPausaFin = async () => {
    setBusy(true)
    try {
      await api.ficharPausaFin(employeeId)
      await refresh()
      showToast('Pausa finalizada.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const solicitarVacaciones = async ({ fechaInicio, fechaFin, motivo }) => {
    setBusy(true)
    try {
      await api.solicitarVacaciones(employeeId, empresaId, fechaInicio, fechaFin, motivo)
      await refresh()
      showToast('Solicitud enviada a gerencia.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const resolverVacaciones = async (id, estado) => {
    setBusy(true)
    try {
      await api.resolverVacaciones(id, estado, 'Patricia Lázaro')
      await refresh()
      showToast(estado === 'aprobada' ? 'Vacaciones aprobadas.' : 'Solicitud rechazada.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Header />
        <div className="screen">
          <p className="empty-state">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header
        crumb={
          screen === 'employees'
            ? 'Selección de empleado'
            : screen === 'employee-pin'
            ? 'Acceso personal'
            : screen === 'employee'
            ? 'Fichaje'
            : screen === 'admin-login' || screen === 'admin'
            ? 'Gerencia'
            : null
        }
      />

      {screen === 'home' && (
        <Home
          onSelectEmpresa={(id) => {
            setEmpresaId(id)
            setScreen('employees')
          }}
          onGerencia={() => setScreen('admin-login')}
        />
      )}

      {screen === 'employees' && (
        <EmployeeList
          empresaId={empresaId}
          estados={db.estados}
          onBack={() => setScreen('home')}
          onSelectEmployee={(id) => {
            setEmployeeId(id)
            setScreen('employee-pin')
          }}
        />
      )}

      {screen === 'employee-pin' && (
        <EmployeeLogin
          employeeId={employeeId}
          onBack={() => setScreen('employees')}
          onSuccess={() => setScreen('employee')}
        />
      )}

      {screen === 'employee' && (
        <EmployeePanel
          employeeId={employeeId}
          db={db}
          busy={busy}
          onBack={() => setScreen('employees')}
          onFicharEntrada={ficharEntrada}
          onFicharSalida={ficharSalida}
          onFicharPausaInicio={ficharPausaInicio}
          onFicharPausaFin={ficharPausaFin}
          onSolicitarVacaciones={solicitarVacaciones}
        />
      )}

      {screen === 'admin-login' && (
        <AdminLogin onBack={() => setScreen('home')} onSuccess={() => setScreen('admin')} />
      )}

      {screen === 'admin' && (
        <AdminPanel
          db={db}
          busy={busy}
          onBack={() => setScreen('home')}
          onResolverVacaciones={resolverVacaciones}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  )
}

function Header({ crumb }) {
  return (
    <div className="topbar">
      <img src="/logo.jpg" alt="HealthyMeat" />
      <div className="brand-text">
        <span className="k">HEALTHYMEAT</span>
        <span className="sub">Control de jornada</span>
      </div>
      <div className="spacer" />
      {crumb && <div className="crumb">{crumb}</div>}
    </div>
  )
}
