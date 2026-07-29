import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_BASE64 } from './logoBase64'

const GOLD = [217, 181, 74]
const INK = [23, 20, 16]
const MUTED = [110, 100, 80]

function drawHeader(doc, { empresa, subtitulo }) {
  doc.setFillColor(...INK)
  doc.rect(0, 0, 210, 32, 'F')
  try {
    doc.addImage(LOGO_BASE64, 'JPEG', 14, 6, 20, 20)
  } catch {
    // si el logo no carga, seguimos sin bloquear el PDF
  }
  doc.setTextColor(...GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('HEALTHYMEAT', 40, 15)
  doc.setFontSize(9)
  doc.setTextColor(230, 222, 200)
  doc.setFont('helvetica', 'normal')
  doc.text('Registro de jornada laboral (Art. 34.9 Estatuto de los Trabajadores)', 40, 21)
  if (empresa) {
    doc.text(`${empresa.razonSocial}${empresa.cif ? ' · CIF ' + empresa.cif : ''}`, 40, 26.5)
  }
  if (subtitulo) {
    doc.setTextColor(...GOLD)
    doc.setFontSize(8)
    doc.text(subtitulo, 196, 26.5, { align: 'right' })
  }
}

function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-ES')} · Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    )
  }
}

// rows: [{ empleadoNombre, dni, fecha, horaEntrada, horaSalida, horasTrabajadas }]
export function generarInformePDF({ empresa, rango, rows, tituloEmpleado }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const subtitulo = rango ? `Del ${rango.desde} al ${rango.hasta}` : ''
  drawHeader(doc, { empresa, subtitulo })

  let y = 40
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(tituloEmpleado || 'Resumen de fichajes', 14, y)
  y += 4

  const totalHoras = rows.reduce((acc, r) => acc + (r.horasTrabajadas || 0), 0)
  const dias = new Set(rows.map((r) => r.fecha)).size

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`${dias} jornada(s) registrada(s) · ${totalHoras.toFixed(2)} horas totales`, 14, y + 5)

  autoTable(doc, {
    startY: y + 10,
    head: [['Empleado', 'Fecha', 'Entrada', 'Pausa', 'Salida', 'Horas']],
    body: rows.map((r) => [
      r.empleadoNombre,
      formatearFecha(r.fecha),
      r.horaEntrada || '—',
      formatearPausas(r.pausas),
      r.horaSalida || 'En curso',
      r.horasTrabajadas != null ? r.horasTrabajadas.toFixed(2) : '—',
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: INK },
    headStyles: { fillColor: INK, textColor: GOLD, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 243, 232] },
    margin: { left: 14, right: 14 },
  })

  const finalY = doc.lastAutoTable.finalY + 10
  if (finalY < 270) {
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      'Este documento resume el registro diario de jornada exigido por el artículo 34.9 del Estatuto de los',
      14,
      finalY
    )
    doc.text(
      'Trabajadores, a disposición de la persona trabajadora, sus representantes legales y la Inspección de Trabajo.',
      14,
      finalY + 4.5
    )
  }

  drawFooter(doc)
  return doc
}

function formatearFecha(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatearPausas(pausas) {
  if (!pausas || pausas.length === 0) return '—'
  return pausas.map((p) => `${p.inicio}-${p.fin || '...'}`).join(', ')
}
