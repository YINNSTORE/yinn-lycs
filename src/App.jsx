import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getTracks, searchTracks, getStreamUrl, getArtwork, getArtist, getGenre,
  formatDuration, getLyrics, translateLyrics, importPlaylist
} from './services/music'

const FONTS = [
  ['DM Sans', 'DM Sans'], ['Rubik', 'Rubik'], ['Inter', 'Inter'],
  ['Manrope', 'Manrope'], ['Poppins', 'Poppins'], ['Nunito', 'Nunito'],
  ['Roboto', 'Roboto'], ['Lato', 'Lato'], ['Montserrat', 'Montserrat'],
  ['Outfit', 'Outfit'], ['Urbanist', 'Urbanist'], ['Sora', 'Sora'],
  ['Plus Jakarta Sans', 'Plus Jakarta Sans'], ['Work Sans', 'Work Sans'],
  ['Quicksand', 'Quicksand'], ['Space Grotesk', 'Space Grotesk']
]

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function Icon({ name, size = 21, strokeWidth = 2.2 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    library: <><path d="M4 4v16M9 4v16M14 5l4-1 3 15-4 1z"/></>,
    heart: <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chart: <><path d="M4 20V12M10 20V5M16 20V9M22 20H2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></>,
    play: <path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>,
    pause: <><path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none"/></>,
    next: <><path d="m5 5 10 7-10 7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/></>,
    prev: <><path d="m19 5-10 7 10 7z" fill="currentColor" stroke="none"/><path d="M5 5v14"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    lyrics: <><path d="M8 5h12M8 10h12M8 15h8M4 5h.01M4 10h.01M4 15h.01"/></>,
    queue: <><path d="M4 6h16M4 12h11M4 18h8"/><path d="m17 15 4 3-4 3z"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></>,
    volume: <><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M17 9a5 5 0 0 1 0 6M19 5a10 10 0 0 1 0 14"/></>,
    moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>,
    coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 3v2m5-2v2"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    mic: <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    sparkle: <><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    translate: <><path d="M4 5h12M10 3v2m4 0c0 6-4 10-9 12m1-8c1.5 3 4 5 7 6M17 14l3 7m-5-3h6"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sparkle}</svg>
}

function getAlbumName(track) {
  if (typeof track?.album === 'string' && track.album.trim()) return track.album
  if (track?.album?.name) return track.album.name
  if (track?.album?.title) return track.album.title
  return track?.collectionName || 'Single'
}

function parseSyncedLyrics(value) {
  return String(value || '').split('\n').map(line => line.replace(/^\[[0-9:.]+\]\s*/, '')).filter(Boolean).join('\n')
}

function App() {
  const audioRef = useRef(null)
  const streamAttemptRef = useRef(0)
  const navTouchStart = useRef(null)
  const searchTimer = useRef(null)
  const sleepRef = useRef(null)
  const [tab, setTab] = useState('Home')
  const [mode, setMode] = useState('trending')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [favorites, setFavorites] = useState(() => readStorage('yinn-v2-favorites', readStorage('yinn-lycs-favorites', [])))
  const [history, setHistory] = useState(() => readStorage('yinn-v2-history', readStorage('yinn-lycs-history', [])))
  const [plays, setPlays] = useState(() => readStorage('yinn-v2-plays', []))
  const [playlists, setPlaylists] = useState(() => readStorage('yinn-v2-playlists', []))
  const [queue, setQueue] = useState([])
  const [activeTrack, setActiveTrack] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.78)
  const [theme, setTheme] = useState(() => readStorage('yinn-v2-theme', 'liquid'))
  const [accent, setAccent] = useState(() => readStorage('yinn-v2-accent', '#9be7ff'))
  const [font, setFont] = useState(() => readStorage('yinn-v2-font', 'DM Sans'))
  const [fontWeight, setFontWeight] = useState(() => readStorage('yinn-v2-weight', 600))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('Tampilan')
  const [collapseNav, setCollapseNav] = useState(() => readStorage('yinn-v2-collapse', true))
  const [scrolled, setScrolled] = useState(false)
  const [dynamicIsland, setDynamicIsland] = useState(() => readStorage('yinn-v2-island', true))
  const [islandOpen, setIslandOpen] = useState(false)
  const [islandStyle, setIslandStyle] = useState(() => readStorage('yinn-v2-island-style', 'capsule'))
  const [islandSize, setIslandSize] = useState(() => readStorage('yinn-v2-island-size', 100))
  const [islandGlow, setIslandGlow] = useState(() => readStorage('yinn-v2-island-glow', true))
  const [islandPosition, setIslandPosition] = useState(() => readStorage('yinn-v2-island-position', 'center'))
  const [islandPreset, setIslandPreset] = useState(() => readStorage('yinn-v2-island-preset', 'classic'))
  const [showPlayer, setShowPlayer] = useState(false)
  const [ambient, setAmbient] = useState(() => readStorage('yinn-v2-ambient', false))
  const [animatedArtwork, setAnimatedArtwork] = useState(() => readStorage('yinn-v2-animated', false))
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsError, setLyricsError] = useState('')
  const [translatedLyrics, setTranslatedLyrics] = useState('')
  const [translationProvider, setTranslationProvider] = useState('google')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [posterStyle, setPosterStyle] = useState('aurora')
  const [posterSize, setPosterSize] = useState('square')
  const [posterFont, setPosterFont] = useState('DM Sans')
  const [posterWeight, setPosterWeight] = useState(700)
  const [posterAlign, setPosterAlign] = useState('center')
  const [posterColor, setPosterColor] = useState('#ffffff')
  const [sleepChoice, setSleepChoice] = useState('off')
  const [sleepRemaining, setSleepRemaining] = useState('')
  const [showSleep, setShowSleep] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('Playlist')
  const [recapPeriod, setRecapPeriod] = useState('year')
  const [showRecapPoster, setShowRecapPoster] = useState(false)
  const [supportUrl, setSupportUrl] = useState(() => readStorage('yinn-v2-support', ''))
  const [fontGlass, setFontGlass] = useState(() => {
    const android = navigator.userAgent.match(/Android\s([0-9]+)/i)
    const androidVersion = android ? Number(android[1]) : 99
    const supportsBlur = CSS.supports?.('backdrop-filter', 'blur(20px)') || CSS.supports?.('-webkit-backdrop-filter', 'blur(20px)')
    return Boolean(supportsBlur && androidVersion >= 13)
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getTracks(mode).then(data => { if (alive) setTracks(data) })
      .catch(err => { if (alive) setError(err.message || 'Gagal memuat musik.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [mode])

  useEffect(() => {
    if (tab !== 'Search') return
    const term = query.trim()
    if (term.length < 2) { setSearchResults([]); setSearchLoading(false); return }
    let alive = true
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearchLoading(true)
      setError('')
      searchTracks(term).then(result => { if (alive) setSearchResults(result.data) })
        .catch(err => { if (alive) setError(err.message || 'Pencarian gagal.') })
        .finally(() => { if (alive) setSearchLoading(false) })
    }, 320)
    return () => { alive = false; clearTimeout(searchTimer.current) }
  }, [query, tab])

  const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value))
  useEffect(() => persist('yinn-v2-favorites', favorites), [favorites])
  useEffect(() => persist('yinn-v2-history', history.slice(0, 100)), [history])
  useEffect(() => persist('yinn-v2-plays', plays.slice(-2000)), [plays])
  useEffect(() => persist('yinn-v2-playlists', playlists), [playlists])
  useEffect(() => { persist('yinn-v2-theme', theme); document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { persist('yinn-v2-accent', accent); document.documentElement.style.setProperty('--accent', accent) }, [accent])
  useEffect(() => { persist('yinn-v2-font', font); document.documentElement.style.setProperty('--app-font', '"' + font + '", sans-serif') }, [font])
  useEffect(() => { persist('yinn-v2-weight', fontWeight); document.documentElement.style.setProperty('--font-weight', String(fontWeight)) }, [fontWeight])
  useEffect(() => persist('yinn-v2-collapse', collapseNav), [collapseNav])
  useEffect(() => persist('yinn-v2-island', dynamicIsland), [dynamicIsland])
  useEffect(() => persist('yinn-v2-island-style', islandStyle), [islandStyle])
  useEffect(() => persist('yinn-v2-island-size', islandSize), [islandSize])
  useEffect(() => persist('yinn-v2-island-glow', islandGlow), [islandGlow])
  useEffect(() => persist('yinn-v2-island-position', islandPosition), [islandPosition])
  useEffect(() => persist('yinn-v2-island-preset', islandPreset), [islandPreset])
  useEffect(() => persist('yinn-v2-ambient', ambient), [ambient])
  useEffect(() => persist('yinn-v2-animated', animatedArtwork), [animatedArtwork])
  useEffect(() => persist('yinn-v2-support', supportUrl), [supportUrl])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!dynamicIsland || !playing) setIslandOpen(false)
  }, [dynamicIsland, playing])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !activeTrack) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeTrack.title || 'Yinn Lycs',
        artist: getArtist(activeTrack),
        album: activeTrack.album || 'Yinn Lycs',
        artwork: getArtwork(activeTrack) ? [{ src: getArtwork(activeTrack), sizes: '512x512', type: 'image/jpeg' }] : []
      })
      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play())
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
      navigator.mediaSession.setActionHandler('nexttrack', playNext)
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious)
    } catch {}
  }, [activeTrack, playing])

  useEffect(() => {
    if (sleepRef.current) window.clearTimeout(sleepRef.current)
    if (sleepChoice === 'off' || sleepChoice === 'end' || !playing) {
      setSleepRemaining(sleepChoice === 'end' ? 'Akhir lagu' : '')
      return
    }
    const mins = Number(sleepChoice)
    if (!mins) return
    const endsAt = Date.now() + mins * 60000
    const update = () => {
      const left = Math.max(0, endsAt - Date.now())
      setSleepRemaining(Math.ceil(left / 60000) + ' mnt')
      if (left <= 0) {
        audioRef.current?.pause()
        setSleepChoice('off')
        setSleepRemaining('')
      } else sleepRef.current = window.setTimeout(update, 1000)
    }
    update()
    return () => window.clearTimeout(sleepRef.current)
  }, [sleepChoice, playing])

  const topPlayed = useMemo(() => {
    const counts = new Map()
    for (const event of plays) {
      const id = event.track?.id
      if (!id) continue
      const old = counts.get(id) || { track: event.track, count: 0 }
      old.count += 1
      counts.set(id, old)
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 50)
  }, [plays])

  const libraryAlbums = useMemo(() => {
    const groups = new Map()
    for (const track of [...favorites, ...history]) {
      const name = getAlbumName(track)
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name).push(track)
    }
    return [...groups.entries()].map(([name, items]) => ({ name, tracks: items }))
  }, [favorites, history])

  const favoriteArtists = useMemo(() => {
    const counts = new Map()
    for (const track of favorites) {
      const name = getArtist(track)
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [favorites])

  const genres = useMemo(() => {
    const names = [...new Set([...tracks, ...favorites].map(getGenre).filter(name => name && name !== 'Lainnya'))]
    return names.slice(0, 12).length ? names.slice(0, 12) : ['Pop', 'Indie', 'Electronic', 'Hip-Hop', 'Rock', 'R&B', 'Dangdut', 'Jazz']
  }, [tracks, favorites])

  const visibleTracks = tab === 'Search' ? searchResults
    : tab === 'Library' ? (libraryFilter === 'Disukai' ? favorites : libraryFilter === 'Top 50' ? topPlayed.map(item => item.track) : libraryFilter === 'Playlist' ? playlists.flatMap(item => item.tracks || []) : favorites)
    : tab === 'History' ? history : tracks

  const playTrack = useCallback(async (track, sourceList = tracks) => {
    if (!track) return
    const isAudiusTrack = track.source === 'audius' || String(track.id || '').startsWith('audius-')

    // Spotify playlist imports are metadata only. Resolve their titles to a
    // streamable Audius upload; Yinn Lycs never embeds an external player.
    if (!isAudiusTrack) {
      const normalize = value => String(value || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\b(feat(?:uring)?|ft)\b.*$/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim()
      const title = normalize(track.title)
      const artist = normalize(getArtist(track))
      const titleTokens = title.split(' ').filter(token => token.length > 1)
      const artistTokens = artist.split(' ').filter(token => token.length > 1)
      const baseTitle = String(track.title || '').replace(/\s*[([{]?\s*(?:feat(?:uring)?|ft)\b.*$/i, '').trim()
      const queries = [...new Set([baseTitle, track.title, baseTitle + ' ' + getArtist(track)].filter(Boolean))]
      const candidates = new Map()

      audioRef.current?.pause()
      setPlaying(false)
      setError('Mencari versi audio di katalog Yinn Lycs...')

      for (const term of queries) {
        try {
          const result = await searchTracks(term)
          for (const candidate of result.data || []) {
            if (candidate.source === 'audius' && candidate.playable !== false) candidates.set(candidate.id, candidate)
          }
          if ([...candidates.values()].some(candidate => normalize(candidate.title) === title)) break
        } catch (lookupError) {
          console.warn('Audius lookup failed:', lookupError)
        }
      }

      const scored = [...candidates.values()].map(candidate => {
        const candidateTitle = normalize(candidate.title)
        const candidateArtist = normalize(getArtist(candidate))
        const candidateTokens = candidateTitle.split(' ').filter(token => token.length > 1)
        const overlap = titleTokens.filter(token => candidateTokens.includes(token)).length
        const titleScore = titleTokens.length ? overlap / titleTokens.length : 0
        const artistScore = artistTokens.length
          ? artistTokens.filter(token => candidateArtist.includes(token)).length / artistTokens.length
          : 0
        const exactTitle = candidateTitle === title
        return { candidate, exactTitle, artistScore, score: exactTitle ? 0.88 + artistScore * 0.12 : titleScore * 0.78 + artistScore * 0.22 }
      }).sort((a, b) => b.score - a.score)

      const best = scored[0]
      const match = best && (
        (best.exactTitle && (best.artistScore >= 0.25 || !artistTokens.length)) ||
        (!best.exactTitle && best.score >= 0.82 && best.artistScore >= 0.35)
      ) ? best.candidate : null

      if (!match) {
        audioRef.current?.pause()
        if (audioRef.current) { audioRef.current.removeAttribute('src'); audioRef.current.load() }
        setQueue(Array.isArray(sourceList) ? sourceList : [])
        setActiveTrack(track)
        setError('Versi streaming lagu ini belum tersedia di katalog Audius. Yinn Lycs hanya memutar audio yang tersedia langsung di katalog kami.')
        return
      }
      await playTrack(match, sourceList)
      return
    }

    if (activeTrack?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => setError('Gagal melanjutkan audio.'))
      else audioRef.current.pause()
      return
    }

    const nextQueue = Array.isArray(sourceList) && sourceList.length ? sourceList : tracks
    setQueue(nextQueue)
    setActiveTrack(track)
    setCurrentTime(0)
    setDuration(0)
    setError('')
    setHistory(previous => [track, ...previous.filter(item => item.id !== track.id)].slice(0, 100))
    setPlays(previous => [...previous, { track, at: Date.now() }].slice(-2000))
    if (!audioRef.current) {
      setError('Pemutar audio belum siap. Muat ulang halaman lalu coba lagi.')
      return
    }
    const audio = audioRef.current
    audio.pause()
    streamAttemptRef.current = 0
    audio.src = getStreamUrl(track.id, 0)
    audio.volume = volume
    audio.load()
    audio.play().catch(() => {
      setPlaying(false)
      setError('Gagal memulai stream Audius. Mencoba server cadangan...')
    })
  }, [activeTrack, tracks, volume])

  const playNext = useCallback(() => {
    if (!queue.length || !activeTrack) return
    const index = queue.findIndex(item => item.id === activeTrack.id)
    const next = queue[(index + 1 + queue.length) % queue.length]
    if (next) playTrack(next, queue)
  }, [queue, activeTrack, playTrack])

  const playPrevious = useCallback(() => {
    if (!audioRef.current || !activeTrack) return
    if (currentTime > 3) { audioRef.current.currentTime = 0; return }
    const index = queue.findIndex(item => item.id === activeTrack.id)
    const previous = queue[(index - 1 + queue.length) % queue.length]
    if (previous) playTrack(previous, queue)
  }, [queue, activeTrack, currentTime, playTrack])

  const toggleFavorite = track => {
    if (!track) return
    setFavorites(previous => previous.some(item => item.id === track.id)
      ? previous.filter(item => item.id !== track.id)
      : [track, ...previous])
  }
  const isFavorite = track => favorites.some(item => item.id === track?.id)
  const togglePlayback = () => {
    if (!activeTrack) { if (tracks[0]) playTrack(tracks[0], tracks); return }
    if (audioRef.current?.paused) audioRef.current.play().catch(() => setError('Gagal memutar lagu.'))
    else audioRef.current?.pause()
  }

  const openLyrics = async () => {
    if (!activeTrack) return
    setShowLyrics(true)
    setLyricsLoading(true)
    setLyricsError('')
    setTranslatedLyrics('')
    try {
      const result = await getLyrics(activeTrack)
      setLyrics(result)
      if (!result.plainLyrics && !result.syncedLyrics) setLyricsError('Lirik belum tersedia di katalog gratis.')
    } catch (err) { setLyricsError(err.message || 'Lirik tidak ditemukan.') }
    finally { setLyricsLoading(false) }
  }

  const runTranslation = async () => {
    const source = lyrics?.plainLyrics || parseSyncedLyrics(lyrics?.syncedLyrics)
    if (!source) return
    setTranslationLoading(true)
    setLyricsError('')
    try {
      const result = await translateLyrics(source, 'id', translationProvider)
      setTranslatedLyrics(result.translated)
    } catch (err) { setLyricsError(err.message || 'Terjemahan gagal.') }
    finally { setTranslationLoading(false) }
  }

  const createPoster = async (title, subtitle, content, story = false) => {
    const canvas = document.createElement('canvas')
    canvas.width = posterSize === 'story' || story ? 1080 : 1080
    canvas.height = posterSize === 'story' || story ? 1920 : 1080
    const ctx = canvas.getContext('2d')
    const gradients = {
      aurora: ['#092a35', '#4d477b', '#10151f'],
      sunset: ['#e37c5a', '#713f65', '#201a36'],
      ocean: ['#12617a', '#14304f', '#080f20'],
      mono: ['#30343b', '#12151a', '#050608']
    }
    const colors = gradients[posterStyle] || gradients.aurora
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.55, colors[1]); gradient.addColorStop(1, colors[2])
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(canvas.width * .8, canvas.height * .16, canvas.width * .34, 0, Math.PI * 2); ctx.fill()
    ctx.textAlign = posterAlign
    ctx.fillStyle = posterColor
    const x = posterAlign === 'left' ? 100 : posterAlign === 'right' ? canvas.width - 100 : canvas.width / 2
    ctx.font = '700 30px "' + posterFont + '"'
    ctx.fillText('YINN LYCS  •  LYRICS', x, 125)
    ctx.font = '700 54px "' + posterFont + '"'
    ctx.fillText(String(title).slice(0, 45), x, 230)
    ctx.font = '400 30px "' + posterFont + '"'
    ctx.globalAlpha = .78; ctx.fillText(String(subtitle).slice(0, 55), x, 285); ctx.globalAlpha = 1
    const lines = String(content || '').split('\n').filter(Boolean).slice(0, 22)
    ctx.font = posterWeight + ' 34px "' + posterFont + '"'
    const maxWidth = canvas.width - 200
    let y = posterSize === 'story' || story ? 420 : 400
    for (const line of lines) {
      const words = line.split(' ')
      let current = ''
      for (const word of words) {
        const test = current ? current + ' ' + word : word
        if (ctx.measureText(test).width > maxWidth && current) {
          ctx.fillText(current, x, y, maxWidth)
          y += 58
          current = word
        } else current = test
      }
      if (current) { ctx.fillText(current, x, y, maxWidth); y += 66 }
      if (y > canvas.height - 170) break
    }
    ctx.globalAlpha = .65; ctx.font = '500 24px "' + posterFont + '"'; ctx.fillText('Your sound. Your story.', x, canvas.height - 80); ctx.globalAlpha = 1
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  const shareLyricsPoster = async () => {
    const text = translatedLyrics || lyrics?.plainLyrics || parseSyncedLyrics(lyrics?.syncedLyrics)
    const blob = await createPoster(activeTrack?.title, getArtist(activeTrack), text)
    if (!blob) return
    const file = new File([blob], 'yinn-lycs-lyrics.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: activeTrack?.title || 'Lyrics' }); return } catch {}
    }
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href)
  }

  const shareTrack = async () => {
    if (!activeTrack) return
    const text = activeTrack.title + ' — ' + getArtist(activeTrack) + ' | Yinn Lycs'
    if (navigator.share) {
      try { await navigator.share({ title: activeTrack.title, text, url: window.location.href }); return } catch {}
    }
    try { await navigator.clipboard.writeText(text); setError('Info lagu disalin.') } catch { setError('Tidak dapat membagikan lagu dari browser ini.') }
  }

  const importLink = async () => {
    setImportLoading(true); setImportError('')
    try {
      const result = await importPlaylist(importUrl.trim())
      const item = { id: 'playlist-' + Date.now(), name: result.name, image: result.image, source: result.source, sourceUrl: result.sourceUrl, tracks: result.tracks || [], importedAt: Date.now() }
      setPlaylists(previous => [item, ...previous])
      setImportUrl('')
      setShowImport(false)
      setTab('Library')
      setLibraryFilter('Playlist')
    } catch (err) { setImportError(err.message || 'Gagal mengimpor playlist.') }
    finally { setImportLoading(false) }
  }

  const startSleep = value => {
    setSleepChoice(value)
    setShowSleep(false)
    if (value !== 'end' && value !== 'off') setSleepRemaining(value + ' mnt')
    else setSleepRemaining(value === 'end' ? 'Akhir lagu' : '')
  }

  const filteredEvents = useMemo(() => {
    const now = Date.now()
    if (recapPeriod === 'all') return plays
    if (recapPeriod === '30') return plays.filter(item => now - item.at <= 30 * 86400000)
    const year = new Date().getFullYear()
    return plays.filter(item => new Date(item.at).getFullYear() === year)
  }, [plays, recapPeriod])

  const recapTop = useMemo(() => {
    const map = new Map()
    filteredEvents.forEach(event => {
      const id = event.track?.id
      if (!id) return
      const entry = map.get(id) || { track: event.track, count: 0 }
      entry.count++
      map.set(id, entry)
    })
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [filteredEvents])

  const recapArtists = useMemo(() => {
    const map = new Map()
    filteredEvents.forEach(event => {
      const artist = getArtist(event.track)
      map.set(artist, (map.get(artist) || 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filteredEvents])

  const shareRecap = async () => {
    const content = recapTop.map((item, index) => (index + 1) + '. ' + item.track.title + ' — ' + getArtist(item.track)).join('\n')
    const blob = await createPoster('Your listening recap', filteredEvents.length + ' plays • ' + (recapPeriod === '30' ? '30 hari' : recapPeriod === 'all' ? 'sepanjang waktu' : new Date().getFullYear()), content || 'Mulai dengarkan musik untuk membuat recap.')
    if (!blob) return
    const file = new File([blob], 'yinn-lycs-recap.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Yinn Lycs Recap' }); return } catch {}
    }
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href)
  }

  const title = tab === 'Search' ? 'Cari lagu, album, artis...' : tab === 'Library' ? 'Pustaka' : tab === 'Stats' ? 'Statistik' : tab === 'About' ? 'Tentang' : tab === 'History' ? 'Riwayat' : 'Beranda'
  const greeting = new Date().getHours() < 11 ? 'Selamat pagi' : new Date().getHours() < 15 ? 'Selamat siang' : new Date().getHours() < 18 ? 'Selamat sore' : 'Selamat malam'

  return (
    <div className={'app-shell' + (ambient ? ' ambient-mode' : '') + (animatedArtwork ? ' artwork-motion' : '')} data-glass={fontGlass ? 'enhanced' : 'lite'}>
      {dynamicIsland && playing && <div className={'dynamic-island ' + islandStyle + ' pos-' + islandPosition + ' preset-' + islandPreset + (islandOpen ? ' expanded' : '') + (islandGlow ? ' glowing' : '')} style={{'--island-scale': islandSize / 100}} onClick={() => setIslandOpen(value => !value)}>
        <div className="island-mini"><span className="island-dot" /><span className="island-title">{activeTrack?.title || 'Yinn Lycs'}</span><span className="island-wave">▂ ▅ ▃ ▆</span></div>
        {islandOpen && <div className="island-expanded"><b>{activeTrack?.title}</b><small>{getArtist(activeTrack)}</small><div><button onClick={event => { event.stopPropagation(); playPrevious() }}><Icon name="prev"/></button><button onClick={event => { event.stopPropagation(); togglePlayback() }}><Icon name="pause"/></button><button onClick={event => { event.stopPropagation(); playNext() }}><Icon name="next"/></button></div></div>}
      </div>}

      <header className="topbar">
        <div className="topbar-title">{title}</div>
        <div className="topbar-actions">
          <button onClick={() => setTab('History')} aria-label="Riwayat"><Icon name="clock"/></button>
          <button onClick={() => setTab('Stats')} aria-label="Statistik"><Icon name="chart"/></button>
          <button onClick={() => setShowImport(true)} aria-label="Impor playlist"><Icon name="users"/></button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Pengaturan"><Icon name="settings"/></button>
        </div>
      </header>

      <main className="main-content">
        {tab === 'Home' && <>
          <section className="greeting"><h1>{greeting}</h1><p>Musik yang cocok untuk hari ini.</p></section>
          {loading && <div className="status"><span className="spinner"/> Memuat musik...</div>}
          {error && <div className="error-box">{error}</div>}
          <section className="quick-grid">
            {(history.slice(0, 6).length ? history.slice(0, 6) : tracks.slice(0, 6)).map((track, index) => <button className="quick-card glass" key={track.id || index} onClick={() => playTrack(track, history.length ? history : tracks)}>
              <div className="quick-art">{getArtwork(track) ? <img src={getArtwork(track)} alt="" /> : <Icon name="library" size={27}/>}</div><span>{track.title}</span>
            </button>)}
          </section>
          <div className="genre-strip">{genres.slice(0, 8).map(genre => <button key={genre} onClick={() => { setQuery(genre); setTab('Search') }}>{genre}</button>)}</div>
          <section className="community-section">
            <div className="section-head"><h2>Dari komunitas</h2><button onClick={() => setShowImport(true)}>Impor playlist <Icon name="plus" size={15}/></button></div>
            <div className="community-row">
              {(playlists.length ? playlists : [{ id: 'community-demo', name: 'Playlist pilihanmu', image: '', tracks: tracks.slice(0, 5), source: 'Yinn Lycs' }]).map(playlist => <article className="community-card glass" key={playlist.id} onClick={() => { setTab('Library'); setLibraryFilter('Playlist') }}>
                <div className="community-hero"><div className="community-cover">{playlist.image ? <img src={playlist.image} alt="" /> : getArtwork(playlist.tracks?.[0]) ? <img src={getArtwork(playlist.tracks[0])} alt="" /> : <Icon name="library" size={36}/>}</div><div><small>{playlist.source || 'YINN LYCS'}</small><h3>{playlist.name}</h3></div></div>
                <div className="community-track-list">{(playlist.tracks || []).slice(0, 3).map((track, index) => <div className="community-track" key={track.id}><span>{index + 1}</span><div className="community-track-art">{getArtwork(track) && <img src={getArtwork(track)} alt="" />}</div><div><b>{track.title}</b><small>{getArtist(track)}</small></div></div>)}</div>
              </article>)}
            </div>
          </section>
          <section className="section-block">
            <div className="section-head"><h2>Speed dial</h2><button onClick={() => setTab('Search')}>Lihat semua <Icon name="arrow" size={15}/></button></div>
            <div className="speed-row">{tracks.slice(0, 8).map(track => <button className="speed-card" key={track.id} onClick={() => playTrack(track, tracks)}><div>{getArtwork(track) ? <img src={getArtwork(track)} alt="" /> : <Icon name="play" size={26}/>}</div><b>{track.title}</b><small>{getArtist(track)}</small></button>)}</div>
          </section>
          <section className="widget-card glass" onClick={() => setAmbient(value => !value)}><div className="widget-art"><Icon name="sparkle" size={30}/></div><div><small>AURALYS GLASS WIDGET</small><b>Ambient music space</b><span>Sentuh untuk {ambient ? 'matikan' : 'aktifkan'} mode ambient</span></div><Icon name="arrow"/></section>
        </>}

        {tab === 'Search' && <>
          <div className="search-field glass"><button onClick={() => setTab('Home')} aria-label="Kembali"><Icon name="back"/></button><input placeholder="Cari lagu, album, artis..." value={query} onChange={event => setQuery(event.target.value)}/><button aria-label="Hapus pencarian" onClick={() => setQuery('')}><Icon name="close"/></button></div>
          {query.trim().length >= 2 ? <>
            {searchLoading && <div className="status"><span className="spinner"/> Mencari katalog musik...</div>}
            {error && <div className="error-box">{error}</div>}
            <TrackList tracks={searchResults} activeTrack={activeTrack} playing={playing} isFavorite={isFavorite} onPlay={playTrack} onFavorite={toggleFavorite}/>
          </> : <>
            <section className="section-block"><h2>Terakhir diputar</h2><div className="recent-row">{history.slice(0, 12).map(track => <button key={track.id} className="recent-card" onClick={() => playTrack(track, history)}><div>{getArtwork(track) ? <img src={getArtwork(track)} alt=""/> : <Icon name="library" size={30}/>}</div><b>{track.title}</b><small>{getArtist(track)}</small></button>)}</div>{!history.length && <p className="muted-note">Lagu yang kamu putar akan muncul di sini.</p>}</section>
            <section className="section-block"><h2>Paling sering diputar</h2><RankedList items={topPlayed.map(item => ({track:item.track,count:item.count}))} onPlay={playTrack}/></section>
            <section className="section-block"><h2>Artis favorit</h2><div className="artist-row">{favoriteArtists.map(([artist,count]) => <div className="artist-chip" key={artist}><div>{artist.slice(0,1).toUpperCase()}</div><b>{artist}</b><small>{count} lagu disukai</small></div>)}</div>{!favoriteArtists.length && <p className="muted-note">Sukai lagu untuk membangun daftar artis favorit.</p>}</section>
            <section className="section-block"><h2>Genre pilihan</h2><div className="genre-grid">{genres.map(genre => <button key={genre} onClick={() => setQuery(genre)}>{genre}<Icon name="arrow" size={15}/></button>)}</div></section>
          </>}
        </>}

        {tab === 'Library' && <>
          <div className="library-tabs">{['Playlist','Lagu','Album','Artis','Podcast'].map(item => <button className={libraryFilter === item ? 'active' : ''} key={item} onClick={() => setLibraryFilter(item)}>{item}</button>)}</div>
          <div className="library-tools"><button onClick={() => setLibraryFilter('Disukai')}>TANGGAL DITAMBAHKAN ↓</button><button onClick={() => setShowImport(true)}><Icon name="plus"/></button><button onClick={() => setTab('Search')}><Icon name="search"/></button><button onClick={() => setLibraryFilter('Top 50')}><Icon name="grid"/></button></div>
          {libraryFilter === 'Playlist' ? <div className="library-grid">
            <button className="library-tile" onClick={() => setLibraryFilter('Disukai')}><div><Icon name="heart" size={68}/></div><b>Disukai</b></button>
            <button className="library-tile" onClick={() => setLibraryFilter('Diunduh')}><div><Icon name="download" size={68}/></div><b>Diunduh</b></button>
            <button className="library-tile" onClick={() => setLibraryFilter('Cache')}><div><Icon name="timer" size={68}/></div><b>Tersimpan di cache</b></button>
            <button className="library-tile" onClick={() => setLibraryFilter('Top 50')}><div><Icon name="chart" size={68}/></div><b>Teratas saya 50</b></button>
            {playlists.map(item => <button className="library-tile imported-tile" key={item.id} onClick={() => setLibraryFilter(item.id)}><div>{item.image ? <img src={item.image} alt=""/> : <Icon name="library" size={50}/>}</div><b>{item.name}</b><small>{item.tracks.length} lagu</small></button>)}
          </div> : libraryFilter === 'Diunduh' || libraryFilter === 'Cache' ? <div className="empty-card"><Icon name="download" size={44}/><b>{libraryFilter === 'Diunduh' ? 'Belum ada lagu offline' : 'Cache lokal belum tersedia'}</b><p>Yinn Lycs memutar musik online dan tidak mengunduh audio tanpa izin pemilik hak.</p></div> : libraryFilter === 'Album' ? <div className="library-grid">{libraryAlbums.map(album => <button className="library-tile imported-tile" key={album.name} onClick={() => playTrack(album.tracks[0], album.tracks)}><div>{getArtwork(album.tracks[0]) ? <img src={getArtwork(album.tracks[0])} alt=""/> : <Icon name="library" size={48}/>}</div><b>{album.name}</b><small>{album.tracks.length} track tersimpan</small></button>)}</div> : libraryFilter === 'Artis' ? <div className="artist-library">{favoriteArtists.map(([artist,count]) => <button className="artist-library-row" key={artist} onClick={() => { const group = favorites.filter(item => getArtist(item) === artist); if (group[0]) playTrack(group[0], group) }}><span>{artist.slice(0,1).toUpperCase()}</span><div><b>{artist}</b><small>{count} lagu disukai</small></div><Icon name="arrow" size={16}/></button>)}</div> : libraryFilter === 'Podcast' ? <div className="empty-card"><Icon name="mic" size={44}/><b>Podcast belum tersedia</b><p>Katalog podcast akan ditambahkan pada pembaruan berikutnya.</p></div> : <TrackList tracks={libraryFilter === 'Top 50' ? topPlayed.map(item => item.track) : libraryFilter === 'Disukai' || libraryFilter === 'Lagu' ? favorites : playlists.find(item => item.id === libraryFilter)?.tracks || []} activeTrack={activeTrack} playing={playing} isFavorite={isFavorite} onPlay={playTrack} onFavorite={toggleFavorite}/>}
        </>}

        {tab === 'History' && <section className="section-block"><h2>Terakhir diputar</h2><RankedList items={history.map((track,index) => ({track,count:index+1}))} onPlay={playTrack}/></section>}

        {tab === 'Stats' && <>
          <div className="recap-heading"><span>YOUR MUSIC STORY</span><h1>Recap kamu.</h1><p>Rangkuman lagu yang kamu dengarkan di perangkat ini.</p></div>
          <div className="recap-switch">{[['year','Tahun ini'],['30','30 hari'],['all','Sepanjang waktu']].map(([value,label]) => <button key={value} className={recapPeriod === value ? 'active' : ''} onClick={() => setRecapPeriod(value)}>{label}</button>)}</div>
          <div className="recap-total glass"><small>TOTAL PEMUTARAN</small><strong>{filteredEvents.length.toLocaleString('id-ID')}</strong><span>{recapPeriod === '30' ? '30 hari terakhir' : recapPeriod === 'all' ? 'sejak mulai memakai Yinn Lycs v2' : new Date().getFullYear()}</span></div>
          <section className="section-block"><h2>Top tracks</h2><RankedList items={recapTop} onPlay={playTrack}/></section>
          <section className="section-block"><h2>Artis paling sering diputar</h2><div className="artist-row">{recapArtists.map(([artist,count],index) => <div className="artist-chip" key={artist}><div>{index+1}</div><b>{artist}</b><small>{count} pemutaran</small></div>)}</div></section>
          <button className="primary-action" onClick={shareRecap}><Icon name="share"/> Bagikan Recap sebagai poster</button>
        </>}

        {tab === 'About' && <>
          <div className="about-hero"><div className="about-logo">♫</div><h1>Yinn Lycs v2</h1><p>Your music, your atmosphere.</p></div>
          <div className="about-card glass"><b>Semua fitur tetap gratis.</b><p>Yinn Lycs adalah ruang musik personal. Ketersediaan katalog, lirik, dan streaming mengikuti layanan sumber masing-masing.</p><label>Link traktir kopi / dukungan<input value={supportUrl} onChange={event => setSupportUrl(event.target.value)} placeholder="Tempel link Saweria / Trakteer kamu"/></label>{supportUrl && <button className="primary-action" onClick={() => window.open(supportUrl, '_blank', 'noopener,noreferrer')}><Icon name="coffee"/> Traktir kopi</button>}</div>
        </>}
      </main>

      <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={() => { if (sleepChoice === 'end') setSleepChoice('off'); else playNext() }} onError={() => {
        if (activeTrack?.source === 'audius' && streamAttemptRef.current === 0) {
          streamAttemptRef.current = 1
          const audio = audioRef.current
          if (audio) { audio.src = getStreamUrl(activeTrack.id, 1); audio.load(); audio.play().catch(() => { setPlaying(false); setError('Track ini sedang tidak tersedia di kedua server Audius.') }) }
          return
        }
        setPlaying(false)
        if (activeTrack?.source === 'audius') setError('Track ini sedang tidak tersedia di kedua server Audius. Coba lagu lain.')
      }}/> 

      <div className={'bottom-dock' + (scrolled && collapseNav ? ' collapsed' : '')}>
        <nav className="mobile-nav glass" aria-label="Navigasi utama" onTouchStart={event => { navTouchStart.current = event.touches[0]?.clientX }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (navTouchStart.current == null || end == null) return; const delta = end - navTouchStart.current; navTouchStart.current = null; if (Math.abs(delta) < 38 || (scrolled && collapseNav)) return; const tabs = ['Home','Search','Library']; const index = Math.max(0, tabs.indexOf(tab)); setTab(tabs[Math.max(0, Math.min(tabs.length - 1, index + (delta < 0 ? 1 : -1)))]) }}>
          {scrolled && collapseNav ? <button className="nav-orb" onClick={() => setTab(tab === 'Home' ? 'Search' : 'Home')}><Icon name={tab === 'Home' ? 'home' : tab === 'Search' ? 'search' : 'library'} size={25}/></button> : <>
            <button className={tab === 'Home' ? 'active' : ''} onClick={() => setTab('Home')}><Icon name="home"/><small>Beranda</small></button>
            <button className={tab === 'Search' ? 'active' : ''} onClick={() => setTab('Search')}><Icon name="search"/><small>Cari</small></button>
            <button className={tab === 'Library' ? 'active' : ''} onClick={() => setTab('Library')}><Icon name="library"/><small>Pustaka</small></button>
          </>}
        </nav>
        <section className="mini-player glass" aria-label="Pemutar mini">
          <div className="mini-player-art">{activeTrack && getArtwork(activeTrack) ? <img src={getArtwork(activeTrack)} alt=""/> : <Icon name="library" size={22}/>}</div>
          <button className="mini-player-meta" onClick={() => setShowPlayer(true)}><b>{activeTrack?.title || 'Pilih lagu'}</b><small>{activeTrack ? getArtist(activeTrack) : 'Yinn Lycs'}</small></button>
          <button onClick={() => activeTrack && toggleFavorite(activeTrack)} aria-label="Sukai">{activeTrack && isFavorite(activeTrack) ? '♥' : '♡'}</button>
          <button className="mini-play" onClick={togglePlayback} aria-label={playing ? 'Jeda' : 'Putar'}><Icon name={playing ? 'pause' : 'play'} size={21}/></button>
          <button onClick={playNext} aria-label="Berikutnya"><Icon name="next" size={22}/></button>
          <div className="mini-progress" style={{'--progress': (duration ? currentTime / duration * 100 : 0) + '%'}}/>
        </section>
      </div>

      {settingsOpen && <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><section className="settings-modal glass" onClick={event => event.stopPropagation()}>
        <div className="modal-head"><div><small>PENGATURAN</small><h2>Personalisasi</h2></div><button onClick={() => setSettingsOpen(false)}><Icon name="close"/></button></div>
        <div className="settings-tabs">{['Tampilan','Pemutar','Dynamic Island','Tentang'].map(item => <button className={settingsTab === item ? 'active' : ''} key={item} onClick={() => setSettingsTab(item)}>{item}</button>)}</div>
        {settingsTab === 'Tampilan' && <div className="settings-content">
          <label>Tema tampilan<select value={theme} onChange={event => setTheme(event.target.value)}><option value="liquid">Liquid Glass</option><option value="midnight">Mode malam</option><option value="aurora">Aurora</option><option value="light">Light</option></select></label>
          <label>Warna aksen<input type="color" value={accent} onChange={event => setAccent(event.target.value)}/></label>
          <div className="setting-presets">{['#a7e8ff','#c6a8ff','#93e6bf','#ffadc7','#ffc47c','#f3f3f3'].map(color => <button key={color} style={{background:color}} onClick={() => setAccent(color)}/>)}</div>
          <label>Jenis font<select value={font} onChange={event => setFont(event.target.value)}>{FONTS.map(([label,value]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="range-label">Ketebalan huruf <b>{fontWeight}</b><input type="range" min="400" max="900" step="100" value={fontWeight} onChange={event => setFontWeight(Number(event.target.value))}/></label>
          <label className="switch-row">Navbar mengecil saat scroll<input type="checkbox" checked={collapseNav} onChange={event => setCollapseNav(event.target.checked)}/></label>
          <label className="switch-row">Mode Ambient<input type="checkbox" checked={ambient} onChange={event => setAmbient(event.target.checked)}/></label>
          <button className="open-island-settings" onClick={() => setSettingsTab('Dynamic Island')}>Pengaturan Dynamic Island <Icon name="arrow" size={15}/></button>
          <label className="switch-row">Artwork bergerak <small>Default mati</small><input type="checkbox" checked={animatedArtwork} onChange={event => setAnimatedArtwork(event.target.checked)}/></label>
        </div>}
        {settingsTab === 'Pemutar' && <div className="settings-content">
          <label className="switch-row">Dynamic Island aktif<input type="checkbox" checked={dynamicIsland} onChange={event => setDynamicIsland(event.target.checked)}/></label>
          <label>Volume utama<input type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))}/></label>
          <label>Link dukungan<input value={supportUrl} onChange={event => setSupportUrl(event.target.value)} placeholder="https://saweria.co/namamu"/></label>
          <p className="muted-note">Kontrol media layar kunci Android tersedia melalui Media Session jika browser mendukungnya.</p>
        </div>}
        {settingsTab === 'Dynamic Island' && <div className="settings-content">
          <label className="switch-row">Aktifkan Dynamic Island<input type="checkbox" checked={dynamicIsland} onChange={event => setDynamicIsland(event.target.checked)}/></label>
          <label>Gaya kapsul<select value={islandStyle} onChange={event => setIslandStyle(event.target.value)}><option value="capsule">Capsule</option><option value="rounded">Rounded</option><option value="minimal">Minimal</option></select></label>
          <label className="range-label">Ukuran <b>{islandSize}%</b><input type="range" min="75" max="120" value={islandSize} onChange={event => setIslandSize(Number(event.target.value))}/></label>
          <label>Posisi kapsul<select value={islandPosition} onChange={event => setIslandPosition(event.target.value)}><option value="center">Tengah</option><option value="left">Kiri</option><option value="right">Kanan</option></select></label>
          <label>Preset cahaya<select value={islandPreset} onChange={event => setIslandPreset(event.target.value)}><option value="classic">Classic</option><option value="neon">Neon</option><option value="soft">Soft</option></select></label>
          <label className="switch-row">Cahaya / glow<input type="checkbox" checked={islandGlow} onChange={event => setIslandGlow(event.target.checked)}/></label>
          <p className="muted-note">Efek kaca penuh diaktifkan bila browser melaporkan dukungan yang sesuai. Browser Android lama memakai kaca ringan.</p>
          <p className="muted-note">Dynamic Island ini tampil di dalam halaman Yinn Lycs. Website tidak dapat membuat overlay mengambang di atas aplikasi Android lain.</p>
        </div>}
        {settingsTab === 'Tentang' && <div className="settings-content"><p>Yinn Lycs v2.0.0</p><p>Semua fitur inti gratis. Streaming, katalog, dan lirik bergantung pada ketersediaan layanan sumber.</p><button className="primary-action" onClick={() => { setSettingsOpen(false); setTab('About') }}>Tentang Yinn Lycs</button></div>}
      </section></div>}

      {showPlayer && <div className="modal-backdrop" onClick={() => setShowPlayer(false)}><section className="full-player glass" onClick={event => event.stopPropagation()}><div className="modal-head"><div><small>NOW PLAYING</small><h2>Music player</h2></div><button onClick={() => setShowPlayer(false)}><Icon name="close"/></button></div><div className="full-art">{activeTrack && getArtwork(activeTrack) ? <img src={getArtwork(activeTrack)} alt=""/> : <Icon name="library" size={64}/>}</div><div className="full-track-meta"><b>{activeTrack?.title || 'Pilih lagu'}</b><span>{activeTrack ? getArtist(activeTrack) : 'Yinn Lycs'}</span></div><div className="full-timeline"><span>{formatDuration(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime,duration || 0)} onChange={event => { if(audioRef.current) audioRef.current.currentTime=Number(event.target.value) }}/><span>{formatDuration(duration)}</span></div><div className="full-controls"><button onClick={playPrevious}><Icon name="prev" size={28}/></button><button className="full-play" onClick={togglePlayback}><Icon name={playing ? 'pause' : 'play'} size={27}/></button><button onClick={playNext}><Icon name="next" size={28}/></button></div><label className="full-volume"><Icon name="volume"/><input type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))}/></label><div className="full-shortcuts"><button onClick={() => {setShowPlayer(false);openLyrics()}}><Icon name="lyrics"/>Lirik</button><button onClick={() => {setShowPlayer(false);setShowQueue(true)}}><Icon name="queue"/>Antrean</button><button onClick={shareTrack}><Icon name="share"/>Bagikan</button><button onClick={() => {setShowPlayer(false);setShowSleep(true)}}><Icon name="timer"/>Timer</button></div></section></div>}

      {showQueue && <div className="modal-backdrop" onClick={() => setShowQueue(false)}><section className="sheet glass" onClick={event => event.stopPropagation()}><div className="modal-head"><div><small>UP NEXT</small><h2>Antrean lagu</h2></div><button onClick={() => setShowQueue(false)}><Icon name="close"/></button></div><RankedList items={queue.map((track,index) => ({track,count:index+1}))} onPlay={track => { playTrack(track, queue); setShowQueue(false) }}/></section></div>}

      {showSleep && <div className="modal-backdrop" onClick={() => setShowSleep(false)}><section className="sheet glass" onClick={event => event.stopPropagation()}><div className="modal-head"><div><small>PLAYBACK</small><h2>Timer tidur</h2></div><button onClick={() => setShowSleep(false)}><Icon name="close"/></button></div><div className="sleep-options">{[['15','15 menit'],['30','30 menit'],['45','45 menit'],['60','1 jam'],['end','Akhir lagu'],['off','Matikan timer']].map(([value,label]) => <button key={value} className={sleepChoice === value ? 'active' : ''} onClick={() => startSleep(value)}>{label}</button>)}</div></section></div>}

      {showLyrics && <div className="modal-backdrop" onClick={() => setShowLyrics(false)}><section className="lyrics-modal glass" onClick={event => event.stopPropagation()}>
        <div className="modal-head"><div><small>LYRICS SPACE</small><h2>{activeTrack?.title || 'Lirik lagu'}</h2><p>{activeTrack ? getArtist(activeTrack) : ''}</p></div><button onClick={() => setShowLyrics(false)}><Icon name="close"/></button></div>
        {lyricsLoading ? <div className="status"><span className="spinner"/> Mencari lirik...</div> : lyricsError && <div className="error-box">{lyricsError}</div>}
        {lyrics && <><div className="lyrics-toolbar"><select value={translationProvider} onChange={event => setTranslationProvider(event.target.value)}><option value="google">Google Translate • Gratis</option><option value="ai">AI Translate</option><option value="deepl">DeepL</option></select><button onClick={runTranslation} disabled={translationLoading}>{translationLoading ? 'Menerjemahkan...' : <><Icon name="translate" size={16}/> Terjemahkan</>}</button></div>
          <div className="lyrics-text">{translatedLyrics || lyrics.plainLyrics || parseSyncedLyrics(lyrics.syncedLyrics) || 'Lirik instrumental / tidak tersedia.'}</div>
          <div className="poster-controls"><div className="poster-head"><b>Bagikan lirik sebagai gambar</b><button onClick={shareLyricsPoster}><Icon name="share" size={16}/> Buat poster</button></div>
            <div className="poster-grid"><label>Latar<select value={posterStyle} onChange={event => setPosterStyle(event.target.value)}><option value="aurora">Aurora</option><option value="sunset">Sunset</option><option value="ocean">Ocean</option><option value="mono">Mono</option></select></label><label>Ukuran<select value={posterSize} onChange={event => setPosterSize(event.target.value)}><option value="square">Square</option><option value="story">Story</option></select></label><label>Font<select value={posterFont} onChange={event => setPosterFont(event.target.value)}>{FONTS.map(([name,value]) => <option value={value} key={value}>{name}</option>)}</select></label><label>Ketebalan<input type="range" min="400" max="900" step="100" value={posterWeight} onChange={event => setPosterWeight(Number(event.target.value))}/></label><label>Rata teks<select value={posterAlign} onChange={event => setPosterAlign(event.target.value)}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label><label>Warna teks<input type="color" value={posterColor} onChange={event => setPosterColor(event.target.value)}/></label></div>
          </div>
        </>}
      </section></div>}

      {showImport && <div className="modal-backdrop" onClick={() => setShowImport(false)}><section className="sheet glass" onClick={event => event.stopPropagation()}><div className="modal-head"><div><small>PLAYLIST TRANSFER</small><h2>Impor playlist</h2></div><button onClick={() => setShowImport(false)}><Icon name="close"/></button></div><p className="muted-note">Tempel link playlist Spotify. Lagu yang bisa diputar akan dicocokkan ke katalog Audius.</p><input className="import-input" value={importUrl} onChange={event => setImportUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/..."/>{importError && <div className="error-box">{importError}</div>}<button className="primary-action" disabled={!importUrl.trim() || importLoading} onClick={importLink}>{importLoading ? 'Mengimpor playlist...' : 'Impor playlist'}</button><p className="muted-note">Impor membutuhkan konfigurasi API provider di Vercel. Playlist hanya membawa metadata. Audio diputar oleh player Yinn Lycs jika tersedia di Audius.</p></section></div>}
    </div>
  )
}

function TrackList({ tracks, activeTrack, playing, isFavorite, onPlay, onFavorite }) {
  if (!tracks.length) return <div className="empty-card">Tidak ada lagu yang cocok ditemukan.</div>
  return <div className="track-list">{tracks.map((track,index) => <article className="list-track" key={track.id}><span className="list-index">{index + 1}</span><button className="list-art" onClick={() => onPlay(track, tracks)}>{getArtwork(track) ? <img src={getArtwork(track)} alt=""/> : <Icon name="music" size={24}/>}</button><button className="list-meta" onClick={() => onPlay(track, tracks)}><b>{track.title}</b><small>{getArtist(track)}</small></button><button className={'list-like' + (isFavorite(track) ? ' liked' : '')} onClick={() => onFavorite(track)}>{isFavorite(track) ? '♥' : '♡'}</button></article>)}</div>
}

function RankedList({ items, onPlay }) {
  if (!items.length) return <p className="muted-note">Belum ada data. Putar beberapa lagu terlebih dahulu.</p>
  return <div className="ranked-list">{items.map((item,index) => <button className="ranked-item" key={item.track.id + '-' + index} onClick={() => onPlay(item.track)}><span>{index + 1}</span><div className="ranked-art">{getArtwork(item.track) ? <img src={getArtwork(item.track)} alt=""/> : <Icon name="library"/>}</div><div><b>{item.track.title}</b><small>{getArtist(item.track)}</small></div><em>{item.count ? item.count + '×' : ''}</em></button>)}</div>
}

export default App
