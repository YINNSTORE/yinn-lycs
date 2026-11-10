const isDev = import.meta.env.DEV
const API = 'https://api.audius.co/v1'

async function request(action, extra = {}) {
  const params = new URLSearchParams({ action, ...extra })
  let url = '/api/music?' + params.toString()

  if (isDev && action !== 'search') {
    const endpoint = action === 'latest' ? '/tracks/latest' : '/tracks/trending'
    const directParams = new URLSearchParams({ app_name: 'YinnLycs', limit: extra.limit || '30' })
    if (extra.offset) directParams.set('offset', extra.offset)
    if (action === 'trending') directParams.set('time', 'week')
    url = API + endpoint + '?' + directParams.toString()
  }

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Tidak bisa mengambil data musik.')
  return payload
}

export async function getTracks(mode) {
  const payload = await request(mode === 'latest' ? 'latest' : 'trending', { limit: '30', offset: '0' })
  return Array.isArray(payload.data) ? payload.data : []
}

export async function searchTracks(query, aiEnabled = true) {
  const payload = await request('search', { q: query, ai: aiEnabled ? '1' : '0' })
  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    ai: payload.ai || { configured: false, used: false, matches: [] },
    sources: payload.sources || {}
  }
}

export function getStreamUrl(trackId) {
  const id = encodeURIComponent(String(trackId).replace(/^audius-/, ''))
  if (isDev) return API + '/tracks/' + id + '/stream?app_name=YinnLycs'
  return '/api/music?action=stream&id=' + id
}

export function getArtwork(track) {
  return track?.artwork?.['480x480'] || track?.artwork?.['150x150'] || track?.artwork?.['1000x1000'] || ''
}

export function getArtist(track) {
  return track?.user?.name || track?.artist_name || 'Unknown artist'
}

export function formatDuration(value) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return minutes + ':' + remainder
}
