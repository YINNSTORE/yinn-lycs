const API = '/api/music'

async function request(action, extra = {}, options = {}) {
  const params = new URLSearchParams({ action, ...extra })
  const response = await fetch(API + '?' + params, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Layanan musik tidak tersedia.')
  return payload
}

export async function getTracks(mode = 'trending') {
  const payload = await request(mode === 'latest' ? 'latest' : 'trending', { limit: '30' })
  return Array.isArray(payload.data) ? payload.data : []
}

export async function searchTracks(query) {
  const payload = await request('search', { q: query })
  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    sources: payload.sources || {}
  }
}

export async function importPlaylist(url) {
  return request('import', {}, { method: 'POST', body: { url } })
}

export async function getLyrics(track) {
  const params = {
    track: track.title || track.trackName || '',
    artist: track.user?.name || track.artist_name || track.artistName || '',
    album: track.album || '',
    duration: String(track.duration || '')
  }
  return request('lyrics', params)
}

export async function translateLyrics(text, target = 'id', provider = 'google') {
  return request('translate', {}, {
    method: 'POST',
    body: { text, target, provider }
  })
}

export function getStreamUrl(trackId, provider = 0) {
  const id = encodeURIComponent(String(trackId).replace(/^audius-/, ''))
  return API + '?action=stream&id=' + id + '&provider=' + (provider === 1 ? '1' : '0')
}

export function getArtwork(track) {
  return track?.artwork?.['480x480'] || track?.artwork?.['150x150'] || track?.artwork?.['1000x1000'] || ''
}

export function getArtist(track) {
  return track?.user?.name || track?.artist_name || track?.artistName || 'Unknown artist'
}

export function getGenre(track) {
  const tags = track?.tags
  const tag = typeof tags === 'string' ? tags.split(',')[0] : Array.isArray(tags) ? tags[0] : ''
  return track?.genre || track?.genre_name || tag || 'Lainnya'
}

export function formatDuration(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  return Math.floor(seconds / 60) + ':' + Math.floor(seconds % 60).toString().padStart(2, '0')
}
