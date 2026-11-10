const AUDIO_HOSTS = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1'
]

const APPLE_STORES = ['ID', 'US', 'GB', 'JP', 'KR', 'AU', 'IN', 'BR']

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10000)
  })
  if (!response.ok) throw new Error('Request failed: ' + response.status)
  return response.json()
}

async function searchAudius(query) {
  for (const host of AUDIO_HOSTS) {
    try {
      const params = new URLSearchParams({
        app_name: 'YinnLycs',
        query,
        limit: '20',
        sort_method: 'relevant'
      })
      const payload = await fetchJson(host + '/tracks/search?' + params)
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
  const stores = await Promise.allSettled(APPLE_STORES.map(async country => {
    const params = new URLSearchParams({
      term: query,
      country,
      media: 'music',
      entity: 'song',
      limit: '12'
    })
    const payload = await fetchJson('https://itunes.apple.com/search?' + params)
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
        country,
        trackViewUrl: track.trackViewUrl,
        collectionViewUrl: track.collectionViewUrl || '',
        source: 'apple',
        sourceLabel: 'Apple Music',
        playable: false
      }))
  }))
  const seen = new Set()
  const output = []
  for (const result of stores) {
    if (result.status !== 'fulfilled') continue
    for (const track of result.value) {
      if (seen.has(track.id)) continue
      seen.add(track.id)
      output.push(track)
    }
  }
  return output
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
  if (host.endsWith('music.apple.com')) {
    const match = url.pathname.match(/\/playlist\/[^/]+\/(pl\.[a-zA-Z0-9.-]+)/)
      || url.pathname.match(/\/playlist\/(pl\.[a-zA-Z0-9.-]+)/)
    if (!match) throw new Error('Link Apple Music harus berupa link playlist.')
    const store = url.pathname.match(/^\/([a-z]{2})\//i)
    return { provider: 'apple', id: match[1], storefront: store ? store[1].toLowerCase() : 'id' }
  }
  throw new Error('Gunakan link playlist Spotify atau Apple Music.')
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
    trackViewUrl: track.external_urls?.spotify || ''
  }))
  return {
    name: details.name || 'Spotify Playlist',
    image: details.images?.[0]?.url || '',
    source: 'spotify',
    sourceUrl: details.external_urls?.spotify || '',
    tracks: tracks.slice(0, 100)
  }
}

async function applePlaylist(playlistId, storefront) {
  const token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN
  if (!token) {
    throw new Error('Impor Apple Music belum dikonfigurasi. Tambahkan APPLE_MUSIC_DEVELOPER_TOKEN di Vercel.')
  }
  const headers = { Authorization: 'Bearer ' + token }
  const base = 'https://api.music.apple.com/v1/catalog/' + encodeURIComponent(storefront) + '/playlists/' + encodeURIComponent(playlistId)
  const details = await fetchJson(base + '?include=tracks', { headers })
  const playlist = details.data?.[0]
  let items = playlist?.relationships?.tracks?.data || []
  let next = playlist?.relationships?.tracks?.next || ''
  while (next && items.length < 100) {
    const page = await fetchJson(next.startsWith('http') ? next : 'https://api.music.apple.com' + next, { headers })
    items.push(...(page.data || []))
    next = page.next || ''
  }
  const tracks = items.slice(0, 100).map(track => ({
    id: 'apple-' + track.id,
    title: track.attributes?.name || 'Untitled',
    artist_name: track.attributes?.artistName || 'Unknown artist',
    user: { name: track.attributes?.artistName || 'Unknown artist' },
    artwork: { '480x480': (track.attributes?.artwork?.url || '').replace('{w}', '600').replace('{h}', '600') },
    duration: Math.round((track.attributes?.durationInMillis || 0) / 1000),
    album: track.attributes?.albumName || '',
    source: 'apple',
    sourceLabel: 'Apple Music',
    playable: false,
    trackViewUrl: track.attributes?.url || ''
  }))
  return {
    name: playlist?.attributes?.name || 'Apple Music Playlist',
    image: playlist?.attributes?.artwork?.url?.replace('{w}', '600').replace('{h}', '600') || '',
    source: 'apple',
    sourceUrl: playlist?.attributes?.url || '',
    tracks
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
        contents: [{ parts: [{ text: 'Translate the following song lyrics into ' + target + '. Preserve line breaks. Do not add explanations.\\n\\n' + text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
      }),
      signal: AbortSignal.timeout(18000)
    })
    if (!response.ok) throw new Error('Terjemahan AI gagal.')
    const result = await response.json()
    return result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\\n') || ''
  }
  const chunks = text.match(/[\\s\\S]{1,1600}/g) || []
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
      const [audius, apple] = await Promise.all([searchAudius(query), searchApple(query)])
      const data = uniqueTracks([...audius, ...apple]).slice(0, 100)
      res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=180')
      return res.status(200).json({ data, sources: { audius: audius.length, apple: apple.length, stores: APPLE_STORES } })
    }

    if (action === 'import') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST.' })
      const url = String(req.body?.url || '').trim()
      if (url.length > 600) return res.status(400).json({ error: 'Link terlalu panjang.' })
      const parsed = parsePlaylistUrl(url)
      const result = parsed.provider === 'spotify'
        ? await spotifyPlaylist(parsed.id)
        : await applePlaylist(parsed.id, parsed.storefront)
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
      const audiusId = id.replace(/^audius-/, '')
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      res.statusCode = 302
      res.setHeader('Location', 'https://api.audius.co/v1/tracks/' + encodeURIComponent(audiusId) + '/stream?app_name=YinnLycs')
      return res.end()
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
        const payload = await fetchJson(host + endpoint + '?' + params, { headers: { Accept: 'application/json' } })
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
  } catch (error) {
    console.error('Music API error:', error)
    return res.status(502).json({ error: error.message || 'Layanan musik sedang bermasalah.' })
  }
}
