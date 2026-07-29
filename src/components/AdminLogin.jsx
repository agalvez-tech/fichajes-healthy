import PinPad from './PinPad'
import { GERENCIA } from '../data'

export default function AdminLogin({ onBack, onSuccess }) {
  return (
    <PinPad
      eyebrow="Acceso gerencia"
      title={GERENCIA.nombre}
      subtitle="Introduce el PIN para aprobar vacaciones y ver los informes."
      correctPin={GERENCIA.pin}
      onBack={onBack}
      onSuccess={onSuccess}
    />
  )
}
