import PinPad from './PinPad'
import { EMPLEADOS } from '../data'

export default function EmployeeLogin({ employeeId, onBack, onSuccess }) {
  const empleado = EMPLEADOS.find((e) => e.id === employeeId)
  if (!empleado) return null

  return (
    <PinPad
      eyebrow="Acceso personal"
      title={empleado.nombre}
      subtitle="Introduce tu PIN para fichar y ver tus vacaciones."
      correctPin={empleado.pin}
      onBack={onBack}
      onSuccess={onSuccess}
    />
  )
}
