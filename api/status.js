// Visita https://tu-dominio.vercel.app/api/status en el navegador para comprobar,
// sin fichar ni mirar logs, si el servidor ve las variables de la base de datos.
// No expone ningún valor secreto, solo si existen o no.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const nombresBuscados = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ]

  const encontradas = {}
  for (const nombre of nombresBuscados) {
    encontradas[nombre] = Boolean(process.env[nombre])
  }

  const relacionadas = Object.keys(process.env).filter((k) => /REDIS|KV_|UPSTASH/i.test(k))

  const conectado =
    (encontradas.UPSTASH_REDIS_REST_URL && encontradas.UPSTASH_REDIS_REST_TOKEN) ||
    (encontradas.KV_REST_API_URL && encontradas.KV_REST_API_TOKEN)

  res.status(200).json({
    conectado,
    mensaje: conectado
      ? 'La función ve las variables de la base de datos. Si sigue sin fichar, el problema es otro.'
      : 'La función NO ve ninguna variable de base de datos válida en este despliegue.',
    variables_esperadas: encontradas,
    variables_relacionadas_encontradas: relacionadas,
  })
}
