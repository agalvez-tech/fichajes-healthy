import { Redis } from '@upstash/redis'
import { DIAS_VACACIONES_ANUALES, contarDiasLaborables, diasSolicitadosEnAnio } from '../src/lib/vacaciones.js'

const redis = Redis.fromEnv()
const DB_KEY = 'healthymeat:fichajes:db'

const emptyDb = () => ({ fichajes: [], vacaciones: [], estados: {} })

async function loadDb() {
  const data = await redis.get(DB_KEY)
  if (!data) return emptyDb()
  // Upstash puede devolver el objeto ya parseado o como string según el cliente/versión
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return emptyDb()
    }
  }
  return data
}

async function saveDb(db) {
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
    if (req.method === 'GET') {
      const db = await loadDb()
      return res.status(200).json(db)
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' })
    }

    const { action, payload } = req.body || {}
    const db = await loadDb()

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
        await saveDb(db)
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
        await saveDb(db)
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
        await saveDb(db)
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
        await saveDb(db)
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
        await saveDb(db)
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
        await saveDb(db)
        return res.status(200).json({ ok: true, solicitud })
      }

      default:
        return res.status(400).json({ error: 'Acción no reconocida.' })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error interno.', detail: String(err) })
  }
}
