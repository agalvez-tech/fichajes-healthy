const BASE = '/api/db'

async function call(method, body) {
  const res = await fetch(BASE, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Error de conexión con el servidor.')
  }
  return data
}

export const api = {
  getAll: () => call('GET'),
  ficharEntrada: (employeeId, empresaId, horarioEntrada) =>
    call('POST', { action: 'ficharEntrada', payload: { employeeId, empresaId, horarioEntrada } }),
  ficharSalida: (employeeId, horarioSalida) =>
    call('POST', { action: 'ficharSalida', payload: { employeeId, horarioSalida } }),
  ficharPausaInicio: (employeeId) =>
    call('POST', { action: 'ficharPausaInicio', payload: { employeeId } }),
  ficharPausaFin: (employeeId) =>
    call('POST', { action: 'ficharPausaFin', payload: { employeeId } }),
  solicitarVacaciones: (employeeId, empresaId, fechaInicio, fechaFin, motivo) =>
    call('POST', {
      action: 'solicitarVacaciones',
      payload: { employeeId, empresaId, fechaInicio, fechaFin, motivo },
    }),
  resolverVacaciones: (id, estado, resueltaPor) =>
    call('POST', { action: 'resolverVacaciones', payload: { id, estado, resueltaPor } }),
  solicitarCorreccion: (employeeId, fichajeId, horaEntrada, horaSalida, motivo) =>
    call('POST', {
      action: 'solicitarCorreccion',
      payload: { employeeId, fichajeId, horaEntrada, horaSalida, motivo },
    }),
  resolverCorreccion: (id, estado, resueltaPor) =>
    call('POST', { action: 'resolverCorreccion', payload: { id, estado, resueltaPor } }),
}
