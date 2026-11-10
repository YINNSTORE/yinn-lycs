const PROVIDERS = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1'
]

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const action = String(req.query.action || 'trending')
  const query = String(req.query.q || '').trim()
  const id = String(req.query.id || '').trim()
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const params = new URLSearchParams({
    app_name: 'YinnLycs',
    limit: String(limit),
    offset: String(offset)
  })
  let endpoint = ''

  if (action === 'search') {
    if (query.length < 2) return res.status(400).json({ error: 'Masukkan minimal 2 karakter.' })
    if (query.length > 120) return res.status(400).json({ error: 'Pencarian terlalu panjang.' })
    endpoint = '/tracks/search'
    params.set('query', query)
    params.set('sort_method', 'relevant')
  } else if (action === 'trending') {
    endpoint = '/tracks/trending'
    params.set('time', 'week')
  } else if (action === 'latest') {
    endpoint = '/tracks/latest'
  } else if (action === 'stream') {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Track ID tidak valid.' })
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.statusCode = 302
    res.setHeader('Location', 'https://api.audius.co/v1/tracks/' + encodeURIComponent(id) + '/stream?app_name=YinnLycs')
    return res.end()
  } else {
    return res.status(400).json({ error: 'Action tidak dikenal.' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')

  for (const host of PROVIDERS) {
    try {
      const response = await fetch(host + endpoint + '?' + params.toString(), {
        headers: { Accept: 'application/json' }
      })
      if (!response.ok) continue
      const payload = await response.json()
      return res.status(200).json(payload)
    } catch (error) {
      console.error('Audius provider error:', error)
    }
  }

  return res.status(502).json({ error: 'Katalog musik sedang tidak tersedia. Coba lagi sebentar.' })
}
