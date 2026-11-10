const AUDIO_HOSTS = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1'
]
const APPLE_STORES = ['ID', 'US', 'GB', 'JP', 'KR', 'AU', 'IN', 'BR']

async function searchAudius(query) {
  for (const host of AUDIO_HOSTS) {
    try {
      const params = new URLSearchParams({ app_name: 'YinnLycs', query, limit: '18', sort_method: 'relevant' })
      const response = await fetch(host + '/tracks/search?' + params.toString())
      if (!response.ok) continue
      const payload = await response.json()
      return (payload.data || []).map(track => ({
        ...track,
        id: 'audius-' + track.id,
        source: 'audius',
        sourceLabel: 'Audius',
        playable: true
      }))
    } catch (error) {
      console.error('Audius search failed:', error)
    }
  }
  return []
}

async function searchApple(query) {
  const results = await Promise.allSettled(APPLE_STORES.map(async country => {
    const params = new URLSearchParams({ term: query, country, media: 'music', entity: 'song', limit: '12' })
    const response = await fetch('https://itunes.apple.com/search?' + params.toString())
    if (!response.ok) return []
    const payload = await response.json()
    return (payload.results || [])
      .filter(track => track.trackId && track.trackName && track.artistName && track.trackViewUrl)
      .map(track => ({
        id: 'apple-' + track.trackId,
        title: track.trackName,
        artist_name: track.artistName,
        user: { name: track.artistName },
        artwork: { '480x480': String(track.artworkUrl100 || '').replace('100x100bb', '600x600bb') },
        duration: Math.round((track.trackTimeMillis || 0) / 1000),
        play_count: 0,
        album: track.collectionName || '',
        genre: track.primaryGenreName || '',
        country: track.country || country,
        trackViewUrl: track.trackViewUrl,
        collectionViewUrl: track.collectionViewUrl || '',
        source: 'apple',
        sourceLabel: 'Apple Music',
        playable: false
      }))
  }))

  const seen = new Set()
  const tracks = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const track of result.value) {
      if (seen.has(track.id)) continue
      seen.add(track.id)
      tracks.push(track)
    }
  }
  return tracks
}

async function identifySongFromLyrics(query) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { configured: false, used: false, matches: [] }

  const prompt = [
    'You are a music identification assistant.',
    'The user may enter a short lyric fragment, a misheard lyric, a song title, or an artist name.',
    'If it is a lyric fragment, use Google Search to identify the most likely song and artist. Prefer Indonesian and regional music when the language suggests it.',
    'Do not reproduce or continue any lyrics. Return only song metadata and a short explanation.',
    'Do not invent a match. If you cannot verify a likely match, return an empty matches array.',
    'Return valid JSON only in this exact shape:',
    '{"matches":[{"title":"song title","artist":"artist name","searchQuery":"song title artist name","reason":"short reason"}]}',
    'Maximum 3 matches. Search query must contain only the title and artist.',
    'User query: ' + JSON.stringify(query)
  ].join('\n')

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini search error:', response.status, errorText.slice(0, 400))
    return { configured: true, used: false, matches: [], error: 'AI sedang sibuk. Hasil pencarian biasa tetap ditampilkan.' }
  }

  const payload = await response.json()
  const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || ''
  const cleaned = raw.replace(/\x60{3}json|\x60{3}/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return { configured: true, used: false, matches: [], error: 'AI belum menemukan kecocokan yang dapat diverifikasi.' }
  }

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
      .filter(item => item && typeof item.title === 'string' && typeof item.artist === 'string')
      .slice(0, 3)
      .map(item => ({
        title: item.title.slice(0, 120),
        artist: item.artist.slice(0, 120),
        searchQuery: (item.searchQuery || (item.title + ' ' + item.artist)).slice(0, 240),
        reason: String(item.reason || 'Kemungkinan cocok berdasarkan potongan lirik.').slice(0, 220)
      }))
    return { configured: true, used: matches.length > 0, matches }
  } catch {
    return { configured: true, used: false, matches: [], error: 'AI belum menemukan kecocokan yang dapat diverifikasi.' }
  }
}

function uniqueTracks(tracks) {
  const seen = new Set()
  return tracks.filter(track => {
    if (seen.has(track.id)) return false
    seen.add(track.id)
    return true
  })
}

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

  if (action === 'search') {
    if (query.length < 2) return res.status(400).json({ error: 'Masukkan minimal 2 karakter.' })
    if (query.length > 160) return res.status(400).json({ error: 'Pencarian terlalu panjang.' })

    const aiRequested = req.query.ai !== '0'
    const ai = aiRequested
      ? await identifySongFromLyrics(query)
      : { configured: Boolean(process.env.GEMINI_API_KEY), used: false, matches: [] }

    const searchTerms = [query]
    if (ai.used) {
      for (const match of ai.matches.slice(0, 2)) {
        if (!searchTerms.includes(match.searchQuery)) searchTerms.push(match.searchQuery)
      }
    }

    const batches = await Promise.all(searchTerms.map(async term => {
      const [audius, apple] = await Promise.all([searchAudius(term), searchApple(term)])
      return { audius, apple }
    }))
    const audiusTracks = uniqueTracks(batches.flatMap(batch => batch.audius))
    const appleTracks = uniqueTracks(batches.flatMap(batch => batch.apple))
    const data = [...audiusTracks, ...appleTracks].slice(0, 100)

    res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=180')
    return res.status(200).json({
      data,
      ai,
      sources: { audius: audiusTracks.length, apple: appleTracks.length, stores: APPLE_STORES }
    })
  }

  const params = new URLSearchParams({ app_name: 'YinnLycs', limit: String(limit), offset: String(offset) })
  let endpoint = ''

  if (action === 'trending') {
    endpoint = '/tracks/trending'
    params.set('time', 'week')
  } else if (action === 'latest') {
    endpoint = '/tracks/latest'
  } else if (action === 'stream') {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Track ID tidak valid.' })
    const audiusId = id.replace(/^audius-/, '')
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.statusCode = 302
    res.setHeader('Location', 'https://api.audius.co/v1/tracks/' + encodeURIComponent(audiusId) + '/stream?app_name=YinnLycs')
    return res.end()
  } else {
    return res.status(400).json({ error: 'Action tidak dikenal.' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
  for (const host of AUDIO_HOSTS) {
    try {
      const response = await fetch(host + endpoint + '?' + params.toString(), { headers: { Accept: 'application/json' } })
      if (!response.ok) continue
      const payload = await response.json()
      const data = (payload.data || []).map(track => ({
        ...track,
        id: 'audius-' + track.id,
        source: 'audius',
        sourceLabel: 'Audius',
        playable: true
      }))
      return res.status(200).json({ ...payload, data })
    } catch (error) {
      console.error('Audius catalog error:', error)
    }
  }
  return res.status(502).json({ error: 'Katalog musik sedang tidak tersedia. Coba lagi sebentar.' })
}
