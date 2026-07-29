import { Redis } from '@upstash/redis'
import { DIAS_VACACIONES_ANUALES, contarDiasLaborables, diasSolicitadosEnAnio } from '../src/lib/vacaciones.js'

const DB_KEY = 'healthymeat:fichajes:db'

const emptyDb = () => ({ fichajes: [], vacaciones: [], correcciones: [], estados: {} })

// Construye el cliente de Redis dentro del handler (no al cargar el archivo) para
// que, si faltan las variables de entorno, el error salga como un JSON claro en
// vez de tumbar la función entera.
function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    const candidatas = Object.keys(process.env).filter((k) =>
      /REDIS|KV_|UPSTASH/i.test(k)
    )
    const detalle =
      candidatas.length > 0
        ? `Variables encontradas con nombres parecidos: ${candidatas.join(', ')}.`
        : 'No encuentro ninguna variable con "REDIS", "KV_" o "UPSTASH" en el nombre en este entorno.'
    throw new Error(
      `Falta conectar la base de datos: no encuentro UPSTASH_REDIS_REST_URL/TOKEN ni KV_REST_API_URL/TOKEN. ${detalle} Ve a Storage → conecta la base de datos Redis a este proyecto → y vuelve a hacer Redeploy.`
    )
  }
  return new Redis({ url, token })
}

async function loadDb(redis) {
  const data = await redis.get(DB_KEY)
  if (!data) return emptyDb()
  let db
  // Upstash puede devolver el objeto ya parseado o como string según el cliente/versión
  if (typeof data === 'string') {
    try {
      db = JSON.parse(data)
    } catch {
      return emptyDb()
    }
  } else {
    db = data
  }
  if (!db.correcciones) db.correcciones = []
  return db
}

async function saveDb(redis, db) {
  await redis.set(DB_KEY, JSON.stringify(db))
}

function hoyISO() {
  const d = new Date()
  const tz = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  return tz.toISOString().slice(0, 10)
}

function horaAhoraMadrid() {
  return new Date().toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function minutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const redis = getRedis()

    if (req.method === 'GET') {
      const db = await loadDb(redis)
      return res.status(200).json(db)
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' })
    }

    const { action, payload } = req.body || {}
    const db = await loadDb(redis)

    switch (action) {
      case 'ficharEntrada': {
        const { employeeId, empresaId, horarioEntrada } = payload
        const fecha = hoyISO()
        const hora = horaAhoraMadrid()
        const existente = db.estados[employeeId]
        if (existente && existente.enCurso) {
          return res.status(409).json({ error: 'Ya tienes un fichaje de entrada sin cerrar.' })
        }
        const registro = {
          id: id(),
          employeeId,
          empresaId,
          fecha,
          horaEntrada: hora,
          horaSalida: null,
          pausas: [],
          horasTrabajadas: null,
          horarioEntrada: horarioEntrada || null,
          horarioSalida: null,
        }
        db.fichajes.push(registro)
        db.estados[employeeId] = { enCurso: true, enPausa: false, fichajeId: registro.id }
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, registro })
      }

      case 'ficharPausaInicio': {
        const { employeeId } = payload
        const estado = db.estados[employeeId]
        if (!estado || !estado.enCurso) {
          return res.status(409).json({ error: 'Primero tienes que fichar la entrada.' })
        }
        if (estado.enPausa) {
          return res.status(409).json({ error: 'Ya tienes una pausa abierta.' })
        }
        const registro = db.fichajes.find((f) => f.id === estado.fichajeId)
        if (!registro) return res.status(404).json({ error: 'No se encontró el fichaje.' })
        registro.pausas.push({ inicio: horaAhoraMadrid(), fin: null })
        estado.enPausa = true
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, registro })
      }

      case 'ficharPausaFin': {
        const { employeeId } = payload
        const estado = db.estados[employeeId]
        if (!estado || !estado.enCurso || !estado.enPausa) {
          return res.status(409).json({ error: 'No tienes ninguna pausa abierta.' })
        }
        const registro = db.fichajes.find((f) => f.id === estado.fichajeId)
        if (!registro) return res.status(404).json({ error: 'No se encontró el fichaje.' })
        const pausaAbierta = [...registro.pausas].reverse().find((p) => !p.fin)
        if (pausaAbierta) pausaAbierta.fin = horaAhoraMadrid()
        estado.enPausa = false
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, registro })
      }

      case 'ficharSalida': {
        const { employeeId, horarioSalida } = payload
        const estado = db.estados[employeeId]
        if (!estado || !estado.enCurso) {
          return res.status(409).json({ error: 'No hay ningún fichaje de entrada abierto.' })
        }
        if (estado.enPausa) {
          return res.status(409).json({ error: 'Termina la pausa antes de fichar la salida.' })
        }
        const registro = db.fichajes.find((f) => f.id === estado.fichajeId)
        if (!registro) {
          return res.status(404).json({ error: 'No se encontró el fichaje.' })
        }
        const hora = horaAhoraMadrid()
        registro.horaSalida = hora
        registro.horarioSalida = horarioSalida || null
        const minsPausas = (registro.pausas || []).reduce((acc, p) => {
          if (!p.fin) return acc
          return acc + Math.max(0, minutos(p.fin) - minutos(p.inicio))
        }, 0)
        const minsTotales = Math.max(0, minutos(hora) - minutos(registro.horaEntrada))
        const minsTrabajados = Math.max(0, minsTotales - minsPausas)
        registro.horasTrabajadas = Math.round((minsTrabajados / 60) * 100) / 100
        db.estados[employeeId] = { enCurso: false, enPausa: false, fichajeId: null }
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, registro })
      }

      case 'solicitarVacaciones': {
        const { employeeId, empresaId, fechaInicio, fechaFin, motivo } = payload
        if (!fechaInicio || !fechaFin) {
          return res.status(400).json({ error: 'Faltan fechas.' })
        }
        const diasSolicitud = contarDiasLaborables(fechaInicio, fechaFin)
        if (diasSolicitud <= 0) {
          return res.status(400).json({ error: 'El rango de fechas no incluye ningún día laborable.' })
        }
        const anio = fechaInicio.slice(0, 4)
        const yaSolicitados = diasSolicitadosEnAnio(db.vacaciones, employeeId, anio)
        if (yaSolicitados + diasSolicitud > DIAS_VACACIONES_ANUALES) {
          const quedan = Math.max(0, DIAS_VACACIONES_ANUALES - yaSolicitados)
          return res.status(409).json({
            error: `Solo te quedan ${quedan} día(s) laborable(s) de vacaciones en ${anio} (de ${DIAS_VACACIONES_ANUALES} al año). Esta solicitud son ${diasSolicitud}.`,
          })
        }
        const solicitud = {
          id: id(),
          employeeId,
          empresaId,
          fechaInicio,
          fechaFin,
          motivo: motivo || '',
          estado: 'pendiente',
          fechaSolicitud: hoyISO(),
          resueltaPor: null,
          fechaResolucion: null,
        }
        db.vacaciones.push(solicitud)
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, solicitud })
      }

      case 'resolverVacaciones': {
        const { id: solicitudId, estado, resueltaPor } = payload
        const solicitud = db.vacaciones.find((v) => v.id === solicitudId)
        if (!solicitud) {
          return res.status(404).json({ error: 'Solicitud no encontrada.' })
        }
        solicitud.estado = estado
        solicitud.resueltaPor = resueltaPor || 'Gerencia'
        solicitud.fechaResolucion = hoyISO()
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, solicitud })
      }

      case 'solicitarCorreccion': {
        const { employeeId, fichajeId, horaEntrada, horaSalida, motivo } = payload
        const registro = db.fichajes.find((f) => f.id === fichajeId && f.employeeId === employeeId)
        if (!registro) {
          return res.status(404).json({ error: 'No se encontró ese fichaje.' })
        }
        if (!registro.horaSalida) {
          return res.status(409).json({ error: 'Solo puedes corregir jornadas ya finalizadas (con salida fichada).' })
        }
        if (!horaEntrada || !horaSalida) {
          return res.status(400).json({ error: 'Indica la hora de entrada y de salida.' })
        }
        if (minutos(horaSalida) <= minutos(horaEntrada)) {
          return res.status(400).json({ error: 'La hora de salida tiene que ser posterior a la de entrada.' })
        }
        const yaPendiente = db.correcciones.find((c) => c.fichajeId === fichajeId && c.estado === 'pendiente')
        if (yaPendiente) {
          return res.status(409).json({ error: 'Ya hay una corrección pendiente de aprobar para este fichaje.' })
        }
        const correccion = {
          id: id(),
          fichajeId,
          employeeId,
          empresaId: registro.empresaId,
          fecha: registro.fecha,
          original: { horaEntrada: registro.horaEntrada, horaSalida: registro.horaSalida },
          propuesto: { horaEntrada, horaSalida },
          motivo: motivo || '',
          estado: 'pendiente',
          fechaSolicitud: hoyISO(),
          resueltaPor: null,
          fechaResolucion: null,
        }
        db.correcciones.push(correccion)
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, correccion })
      }

      case 'resolverCorreccion': {
        const { id: correccionId, estado, resueltaPor } = payload
        const correccion = db.correcciones.find((c) => c.id === correccionId)
        if (!correccion) {
          return res.status(404).json({ error: 'Corrección no encontrada.' })
        }
        if (correccion.estado !== 'pendiente') {
          return res.status(409).json({ error: 'Esta corrección ya estaba resuelta.' })
        }
        if (estado === 'aprobada') {
          const registro = db.fichajes.find((f) => f.id === correccion.fichajeId)
          if (registro) {
            registro.horaEntrada = correccion.propuesto.horaEntrada
            registro.horaSalida = correccion.propuesto.horaSalida
            const minsPausas = (registro.pausas || []).reduce((acc, p) => {
              if (!p.fin) return acc
              return acc + Math.max(0, minutos(p.fin) - minutos(p.inicio))
            }, 0)
            const minsTotales = Math.max(0, minutos(registro.horaSalida) - minutos(registro.horaEntrada))
            registro.horasTrabajadas = Math.round((Math.max(0, minsTotales - minsPausas) / 60) * 100) / 100
            registro.corregido = true
          }
        }
        correccion.estado = estado
        correccion.resueltaPor = resueltaPor || 'Gerencia'
        correccion.fechaResolucion = hoyISO()
        await saveDb(redis, db)
        return res.status(200).json({ ok: true, correccion })
      }

      default:
        return res.status(400).json({ error: 'Acción no reconocida.' })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Error interno.', detail: String(err) })
  }
}
