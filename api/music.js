const AUDIO_HOSTS = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1'
]

function audiusHeaders() {
  const token = process.env.AUDIUS_API_BEARER_TOKEN?.trim()
  return token ? { Authorization: 'Bearer ' + token, Accept: 'application/json' } : { Accept: 'application/json' }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10000)
  })
  if (!response.ok) throw new Error('Request failed: ' + response.status)
  return response.json()
}

async function searchAudius(query) {
  const collected = []
  for (const host of AUDIO_HOSTS) {
    try {
      const params = new URLSearchParams({
        app_name: 'YinnLycs',
        query,
        limit: '30',
        sort_method: 'relevant'
      })
      const payload = await fetchJson(host + '/tracks/search?' + params, { headers: audiusHeaders() })
      const found = (payload.data || []).filter(track => track.is_streamable !== false && !track.is_stream_gated && track.is_available !== false).map(track => ({
        ...track,
        id: 'audius-' + track.id,
        source: 'audius',
        sourceLabel: 'Audius',
        playable: track.is_streamable !== false && !track.is_stream_gated
      }))
      collected.push(...found)
    } catch (error) {
      console.error('Audius search failed:', error)
    }
  }
  // One provider can return HTTP 200 with an empty or incomplete index.
  // Merge both discovery hosts before deciding that a track is unavailable.
  return uniqueTracks(collected).slice(0, 50)
}

function uniqueTracks(items) {
  const seen = new Set()
  return items.filter(item => {
    if (!item || !item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function parsePlaylistUrl(raw) {
  let url
  try { url = new URL(raw) } catch { throw new Error('Link playlist tidak valid.') }
  const host = url.hostname.toLowerCase()
  if (host.endsWith('spotify.com') || host === 'spotify.link') {
    const match = url.pathname.match(/playlist\/([a-zA-Z0-9]+)/)
    if (!match) throw new Error('Link Spotify harus berupa link playlist.')
    return { provider: 'spotify', id: match[1] }
  }
  throw new Error('Gunakan link playlist Spotify.')
}

async function spotifyPlaylist(playlistId) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Impor Spotify belum dikonfigurasi. Tambahkan SPOTIFY_CLIENT_ID dan SPOTIFY_CLIENT_SECRET di Vercel.')
  }
  const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64')
  const tokenData = await fetchJson('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  const token = tokenData.access_token
  const details = await fetchJson('https://api.spotify.com/v1/playlists/' + playlistId + '?market=ID', {
    headers: { Authorization: 'Bearer ' + token }
  })
  let offset = 0
  const items = []
  while (offset < 100) {
    const limit = Math.min(50, 100 - offset)
    const page = await fetchJson('https://api.spotify.com/v1/playlists/' + playlistId + '/items?market=ID&limit=' + limit + '&offset=' + offset, {
      headers: { Authorization: 'Bearer ' + token }
    })
    items.push(...(page.items || []))
    if (!page.next || !(page.items || []).length) break
    offset += page.items.length
  }
  const tracks = items.map(item => item.item || item.track).filter(track => track && track.type === 'track').map(track => ({
    id: 'spotify-' + track.id,
    title: track.name,
    artist_name: (track.artists || []).map(artist => artist.name).join(', '),
    user: { name: (track.artists || []).map(artist => artist.name).join(', ') },
    artwork: { '480x480': track.album?.images?.[0]?.url || '' },
    duration: Math.round((track.duration_ms || 0) / 1000),
    album: track.album?.name || '',
    source: 'spotify',
    sourceLabel: 'Spotify',
    playable: false,
  }))
  return {
    name: details.name || 'Spotify Playlist',
    image: details.images?.[0]?.url || '',
    source: 'spotify',
    sourceUrl: details.external_urls?.spotify || '',
    tracks: tracks.slice(0, 100)
  }
}

async function getLyrics(req) {
  const track = String(req.query.track || '').trim()
  const artist = String(req.query.artist || '').trim()
  const album = String(req.query.album || '').trim()
  const duration = Math.max(0, Number(req.query.duration) || 0)
  if (!track || !artist) throw new Error('Judul dan artis dibutuhkan untuk mencari lirik.')
  const params = new URLSearchParams({ track_name: track, artist_name: artist })
  if (album) params.set('album_name', album)
  if (duration) params.set('duration', String(duration))
  try {
    return await fetchJson('https://lrclib.net/api/get?' + params, {
      headers: { 'User-Agent': 'YinnLycs/2.0 (https://github.com/YINNSTORE/yinn-lycs)', 'Lrclib-Client': 'YinnLycs/2.0' }
    })
  } catch {
    const search = new URLSearchParams({ track_name: track, artist_name: artist })
    const list = await fetchJson('https://lrclib.net/api/search?' + search, {
      headers: { 'User-Agent': 'YinnLycs/2.0 (https://github.com/YINNSTORE/yinn-lycs)', 'Lrclib-Client': 'YinnLycs/2.0' }
    })
    return list?.[0] || null
  }
}

async function translateText(text, target, provider) {
  if (provider === 'deepl') {
    const key = process.env.DEEPL_API_KEY
    if (!key) throw new Error('DeepL belum diaktifkan. Tambahkan DEEPL_API_KEY di Vercel.')
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { Authorization: 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [text], target_lang: target.toUpperCase() }),
      signal: AbortSignal.timeout(18000)
    })
    if (!response.ok) throw new Error('DeepL gagal menerjemahkan teks.')
    const result = await response.json()
    return result.translations?.[0]?.text || ''
  }
  if (provider === 'ai') {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('Terjemahan AI belum diaktifkan. Tambahkan GEMINI_API_KEY di Vercel.')
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Translate the following song lyrics into ' + target + '. Preserve line breaks. Do not add explanations.\n\n' + text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
      }),
      signal: AbortSignal.timeout(18000)
    })
    if (!response.ok) throw new Error('Terjemahan AI gagal.')
    const result = await response.json()
    return result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || ''
  }
  const chunks = text.match(/[\s\S]{1,1600}/g) || []
  const translated = await Promise.all(chunks.map(async chunk => {
    const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: chunk })
    const response = await fetch('https://translate.googleapis.com/translate_a/single?' + params, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error('Google Terjemahan sedang tidak tersedia.')
    const result = await response.json()
    return (result[0] || []).map(part => part[0] || '').join('')
  }))
  return translated.join('')
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const action = String(req.query.action || 'trending')
  const query = String(req.query.q || '').trim()
  const id = String(req.query.id || '').trim()
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  try {
    if (action === 'search') {
      if (query.length < 2) return res.status(400).json({ error: 'Masukkan minimal 2 karakter.' })
      if (query.length > 160) return res.status(400).json({ error: 'Pencarian terlalu panjang.' })
      const audius = await searchAudius(query)
      res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=180')
      return res.status(200).json({ data: audius, sources: { audius: audius.length } })
    }

    if (action === 'import') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
      const url = String(req.body?.url || '').trim()
      if (url.length > 600) return res.status(400).json({ error: 'Link terlalu panjang.' })
      const parsed = parsePlaylistUrl(url)
      const result = await spotifyPlaylist(parsed.id)
      return res.status(200).json(result)
    }

    if (action === 'lyrics') {
      const result = await getLyrics(req)
      if (!result) return res.status(404).json({ error: 'Lirik belum tersedia di katalog gratis.' })
      return res.status(200).json({
        trackName: result.trackName,
        artistName: result.artistName,
        plainLyrics: result.plainLyrics || '',
        syncedLyrics: result.syncedLyrics || '',
        instrumental: Boolean(result.instrumental)
      })
    }

    if (action === 'translate') {
      const text = String(req.body?.text || '')
      const target = String(req.body?.target || 'id').slice(0, 8)
      const provider = String(req.body?.provider || 'google')
      if (!text.trim() || text.length > 12000) return res.status(400).json({ error: 'Teks kosong atau terlalu panjang.' })
      if (!['google', 'ai', 'deepl'].includes(provider)) return res.status(400).json({ error: 'Provider tidak dikenal.' })
      const translated = await translateText(text, target, provider)
      return res.status(200).json({ translated, provider })
    }

    if (action === 'stream') {
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Track ID tidak valid.' })
      if (!/^audius-[a-zA-Z0-9_-]+$/.test(id) && !/^[0-9]+$/.test(id)) return res.status(400).json({ error: 'Track ID bukan ID Audius.' })
      const audiusId = id.replace(/^audius-/, '')
      const preferred = Number(req.query.provider) === 1 ? 1 : 0
      const hosts = [AUDIO_HOSTS[preferred], AUDIO_HOSTS[1 - preferred]]
      const params = new URLSearchParams({ app_name: 'YinnLycs' })

      for (const host of hosts) {
        try {
          const upstream = await fetch(host + '/tracks/' + encodeURIComponent(audiusId) + '/stream?' + params, {
            headers: { ...audiusHeaders(), Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8', ...(req.headers.range ? { Range: req.headers.range } : {}) },
            redirect: 'manual',
            signal: AbortSignal.timeout(15000)
          })
          const location = upstream.headers.get('location')
          if (upstream.status >= 300 && upstream.status < 400 && location) {
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('Location', location)
            return res.status(upstream.status).end()
          }
          if (upstream.ok) {
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes')
            const contentRange = upstream.headers.get('content-range')
            const contentLength = upstream.headers.get('content-length')
            if (contentRange) res.setHeader('Content-Range', contentRange)
            if (contentLength) res.setHeader('Content-Length', contentLength)
            const audio = Buffer.from(await upstream.arrayBuffer())
            return res.status(upstream.status === 206 ? 206 : 200).send(audio)
          }
          console.error('Audius stream provider failed:', upstream.status, host)
        } catch (error) {
          console.error('Audius stream request failed:', error)
        }
      }
      return res.status(502).json({ error: 'Stream Audius tidak tersedia. Coba lagu lain.' })
    }

    const params = new URLSearchParams({ app_name: 'YinnLycs', limit: String(limit), offset: String(offset) })
    let endpoint = ''
    if (action === 'trending') {
      endpoint = '/tracks/trending'
      params.set('time', 'week')
    } else if (action === 'latest') {
      endpoint = '/tracks/latest'
    } else {
      return res.status(400).json({ error: 'Action tidak dikenal.' })
    }

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    for (const host of AUDIO_HOSTS) {
      try {
        const payload = await fetchJson(host + endpoint + '?' + params, { headers: audiusHeaders() })
        const data = (payload.data || []).filter(track => track.is_streamable !== false && !track.is_stream_gated && track.is_available !== false).map(track => ({
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
  } catch (error) {
    console.error('Music API error:', error)
    return res.status(502).json({ error: error.message || 'Layanan musik sedang bermasalah.' })
  }
}
