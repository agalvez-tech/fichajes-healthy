// Funciones puras, sin dependencias de React, para poder importarlas
// tanto desde el frontend (src/) como desde las funciones serverless (api/).

export const DIAS_VACACIONES_ANUALES = 22

// Cuenta días laborables (lunes a viernes) entre dos fechas ISO 'YYYY-MM-DD', ambas incluidas.
export function contarDiasLaborables(fechaInicioISO, fechaFinISO) {
  if (!fechaInicioISO || !fechaFinISO) return 0
  const start = new Date(fechaInicioISO + 'T00:00:00Z')
  const end = new Date(fechaFinISO + 'T00:00:00Z')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getUTCDay() // 0 domingo, 6 sábado
    if (day !== 0 && day !== 6) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

// Días laborables ya solicitados (pendientes + aprobados) por un empleado en un año concreto.
export function diasSolicitadosEnAnio(vacaciones, employeeId, anio, excluirId = null) {
  return vacaciones
    .filter((v) => v.employeeId === employeeId)
    .filter((v) => v.estado !== 'rechazada')
    .filter((v) => excluirId == null || v.id !== excluirId)
    .filter((v) => v.fechaInicio && v.fechaInicio.slice(0, 4) === String(anio))
    .reduce((acc, v) => acc + contarDiasLaborables(v.fechaInicio, v.fechaFin), 0)
}
