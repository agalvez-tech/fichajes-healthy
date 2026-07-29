// Datos de empresas y empleados — HealthyMeat
// Para añadir o modificar empleados, edita este archivo y vuelve a desplegar.

export const EMPRESAS = [
  {
    id: 'healthymeatfit',
    nombre: 'HealthyMeat Fit, S.L.',
    razonSocial: 'HEALTHYMEATFIT, S.L.',
    cif: 'B44684827',
    ccc: '46 158303701 233',
    domicilio: 'Av. de la Creu, 18',
    poblacion: 'Museros (Valencia)',
  },
  {
    id: 'healthymeatrestauracion',
    nombre: 'HealthyMeat Restauración, S.L.',
    razonSocial: 'HEALTHYMEATRESTAURACION, S.L.',
    cif: 'B56564230',
    ccc: '46 159823769 260',
    domicilio: "Cl. L'Estació, 21",
    poblacion: 'Museros (Valencia)',
  },
]

// Días de vacaciones laborales que corresponden a cada empleado por año natural.
export const DIAS_VACACIONES_ANUALES = 22

export const EMPLEADOS = [
  {
    id: 'nadiia-feodoriuk',
    nombre: 'Nadiia Feodoriuk',
    dni: 'Z0164005C',
    pin: '4005',
    empresaId: 'healthymeatfit',
    categoria: 'Grupo A',
    puesto: '',
    horario: { entrada: '06:00', salida: '09:00' },
    fechaAlta: '2026-01-14',
  },
  {
    id: 'marcelo-vega-lopez',
    nombre: 'Marcelo G. Vega López',
    dni: 'Y3445478T',
    pin: '5478',
    empresaId: 'healthymeatfit',
    categoria: 'Grupo B',
    puesto: 'Esp. Transporte',
    horario: { entrada: '06:00', salida: '14:00' },
    fechaAlta: '2026-05-18',
  },
  {
    id: 'monica-costa-grau',
    nombre: 'Mª Mónica Costa Grau',
    dni: '73575830A',
    pin: '5830',
    empresaId: 'healthymeatfit',
    categoria: 'Grupo A',
    puesto: 'Dpto. Elaboración',
    horario: { entrada: '06:00', salida: '14:00' },
    fechaAlta: '2024-11-01',
  },
  {
    id: 'biot-vicente-alcover',
    nombre: 'Biot Vicente Alcover',
    dni: '44799043B',
    pin: '9043',
    empresaId: 'healthymeatfit',
    categoria: 'Grupo C',
    puesto: 'Encargado',
    horario: { entrada: '06:00', salida: '14:00' },
    fechaAlta: '2024-11-04',
  },
  {
    id: 'noelia-gomez-marti',
    nombre: 'Noelia Gómez Martí',
    dni: '21014021W',
    pin: '4021',
    empresaId: 'healthymeatrestauracion',
    categoria: 'Admin',
    puesto: 'Administrativa',
    horario: { entrada: '08:00', salida: '14:00' },
    fechaAlta: '2025-04-02',
  },
]

// Perfil de gerencia: aprueba/rechaza vacaciones y accede a los informes.
// Cambia el PIN antes de poner la app en producción (ver README).
export const GERENCIA = {
  nombre: 'Gerencia',
  pin: '2026',
}

export function empresaDe(empleado) {
  return EMPRESAS.find((e) => e.id === empleado.empresaId)
}

export function empleadosDeEmpresa(empresaId) {
  return EMPLEADOS.filter((e) => e.empresaId === empresaId)
}
