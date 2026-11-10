import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getTracks, searchTracks, getStreamUrl, getArtwork, getArtist, formatDuration
} from './services/music'

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const audioRef = useRef(null)
  const searchTimer = useRef(null)
  const [tab, setTab] = useState('Home')
  const [mode, setMode] = useState('trending')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiInfo, setAiInfo] = useState(null)
  const [tracks, setTracks] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [favorites, setFavorites] = useState(() => readStorage('yinn-lycs-favorites', []))
  const [history, setHistory] = useState(() => readStorage('yinn-lycs-history', []))
  const [queue, setQueue] = useState([])
  const [activeTrack, setActiveTrack] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [theme, setTheme] = useState(() => readStorage('yinn-lycs-theme', 'liquid'))
  const [accent, setAccent] = useState(() => readStorage('yinn-lycs-accent', '#9be7ff'))
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getTracks(mode)
      .then(data => { if (alive) setTracks(data) })
      .catch(err => { if (alive) setError(err.message || 'Gagal memuat katalog musik.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [mode, reloadKey])

  useEffect(() => {
    if (tab !== 'Search') return
    const term = query.trim()
    if (term.length < 2) {
      setSearchResults([])
      setAiInfo(null)
      setSearchLoading(false)
      return
    }
    let alive = true
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearchLoading(true)
      setError('')
      searchTracks(term, aiEnabled)
        .then(payload => {
          if (!alive) return
          setSearchResults(payload.data)
          setAiInfo(payload.ai)
        })
        .catch(err => { if (alive) setError(err.message || 'Pencarian gagal.') })
        .finally(() => { if (alive) setSearchLoading(false) })
    }, 350)
    return () => {
      alive = false
      clearTimeout(searchTimer.current)
    }
  }, [query, tab, aiEnabled])

  useEffect(() => {
    localStorage.setItem('yinn-lycs-favorites', JSON.stringify(favorites))
  }, [favorites])
  useEffect(() => {
    localStorage.setItem('yinn-lycs-history', JSON.stringify(history.slice(0, 60)))
  }, [history])
  useEffect(() => {
    localStorage.setItem('yinn-lycs-theme', JSON.stringify(theme))
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    localStorage.setItem('yinn-lycs-accent', JSON.stringify(accent))
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const visibleTracks = useMemo(() => {
    if (tab === 'Search') return searchResults
    if (tab === 'Library') return favorites
    if (tab === 'History') return history
    return tracks
  }, [tab, searchResults, favorites, history, tracks])

  const playTrack = useCallback((track, sourceList) => {
    if (!track || !track.id) return
    if (track.source === 'apple' && track.trackViewUrl) {
      window.open(track.trackViewUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (!audioRef.current) return
    if (activeTrack && activeTrack.id === track.id) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => setError('Browser tidak dapat memutar audio ini.'))
      } else {
        audioRef.current.pause()
      }
      return
    }

    const nextQueue = Array.isArray(sourceList) && sourceList.length ? sourceList : tracks
    setQueue(nextQueue)
    setActiveTrack(track)
    setCurrentTime(0)
    setDuration(0)
    setError('')
    setHistory(previous => [track, ...previous.filter(item => item.id !== track.id)].slice(0, 60))

    const audio = audioRef.current
    audio.src = getStreamUrl(track.id)
    audio.volume = volume
    audio.load()
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false)
        setError('Lagu gagal diputar. Coba lagu lain atau periksa koneksi internet.')
      })
  }, [activeTrack, tracks, volume])

  const toggleFavorite = (track) => {
    if (!track) return
    setFavorites(previous => previous.some(item => item.id === track.id)
      ? previous.filter(item => item.id !== track.id)
      : [track, ...previous])
  }

  const isFavorite = (track) => favorites.some(item => item.id === track.id)

  const playNext = useCallback(() => {
    if (!queue.length || !activeTrack) return
    const index = queue.findIndex(item => item.id === activeTrack.id)
    const next = queue[(index + 1 + queue.length) % queue.length]
    if (next) playTrack(next, queue)
  }, [queue, activeTrack, playTrack])

  const playPrevious = () => {
    if (!audioRef.current || !activeTrack) return
    if (currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    const index = queue.findIndex(item => item.id === activeTrack.id)
    const previous = queue[(index - 1 + queue.length) % queue.length]
    if (previous) playTrack(previous, queue)
  }

  const togglePlayback = () => {
    if (!activeTrack) {
      const first = tracks[0]
      if (first) playTrack(first, tracks)
      return
    }
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => setError('Tidak dapat melanjutkan pemutaran.'))
    } else {
      audioRef.current.pause()
    }
  }

  const pageTitle = tab === 'Search' ? 'Cari musik'
    : tab === 'Library' ? 'Lagu favorit'
    : tab === 'History' ? 'Baru diputar'
    : mode === 'latest' ? 'Rilisan terbaru' : 'Lagi trending'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setTab('Home') }}>
          <span className="brand-mark">♫</span>
          <span>Yinn<span className="brand-light">Lycs</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <button className={tab === 'Home' ? 'nav-active' : ''} onClick={() => setTab('Home')}>Beranda</button>
          <button className={tab === 'Search' ? 'nav-active' : ''} onClick={() => setTab('Search')}>Jelajahi</button>
          <button className={tab === 'Library' ? 'nav-active' : ''} onClick={() => setTab('Library')}>Favorit</button>
          <button className={tab === 'History' ? 'nav-active' : ''} onClick={() => setTab('History')}>Riwayat</button>
        </nav>
        <div className="top-actions">
          <span className="online-pill"><i /> ONLINE CATALOG</span>
          <button className="settings-button" onClick={() => setSettingsOpen(value => !value)} aria-label="Pengaturan">⚙</button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow">YOUR PERSONAL MUSIC SPACE</div>
          <h1>Temukan irama<br /><span>versi kamu.</span></h1>
          <p>Jelajahi katalog musik dari berbagai negara. Putar lagu Audius dan temukan rilisan global melalui Apple Music.</p>
          <button className="hero-button" onClick={() => { setTab('Home'); setMode('trending') }}>Jelajahi musik <span>↗</span></button>
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="hero-note">♫</div>
        </section>

        {settingsOpen && (
          <section className="settings-panel glass-panel">
            <div className="settings-title"><b>Personalisasi</b><button onClick={() => setSettingsOpen(false)} aria-label="Tutup">×</button></div>
            <label>Tema tampilan
              <select value={theme} onChange={event => setTheme(event.target.value)}>
                <option value="liquid">Liquid Glass</option>
                <option value="midnight">Midnight</option>
                <option value="aurora">Aurora</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label>Warna aksen <input type="color" value={accent} onChange={event => setAccent(event.target.value)} /></label>
            <div className="theme-presets"><span>Preset warna</span><div>{['#9be7ff','#b9a0ff','#8ee4b8','#ff9fc5','#ffc27d'].map(color => <button key={color} style={{'--swatch':color}} aria-label={'Pilih warna '+color} onClick={() => setAccent(color)} />)}</div></div>
            <button className="night-mode-toggle" onClick={() => setTheme(theme === 'midnight' ? 'liquid' : 'midnight')}>{theme === 'midnight' ? '☀ Kembali ke Liquid Glass' : '☾ Aktifkan mode malam'}</button>
          </section>
        )}

        {tab === 'Home' && (
          <section className="mode-row">
            <div><span className="eyebrow">MUSIC DISCOVERY</span><h2>Pilih suasana</h2></div>
            <div className="mode-switch">
              <button className={mode === 'trending' ? 'selected' : ''} onClick={() => setMode('trending')}>Trending</button>
              <button className={mode === 'latest' ? 'selected' : ''} onClick={() => setMode('latest')}>Terbaru</button>
            </div>
          </section>
        )}

        {tab === 'Search' && (
          <section className="search-section">
            <div className="search-box glass-panel"><span>⌕</span><input autoFocus placeholder="Cari judul, artis, atau potongan lirik..." value={query} onChange={event => setQuery(event.target.value)} /><button onClick={() => setQuery('')} aria-label="Hapus pencarian">×</button></div>
            <div className="search-tools"><p className="search-hint">Cari judul, penyanyi, atau potongan lirik lagu.</p><button className={'ai-toggle' + (aiEnabled ? ' enabled' : '')} onClick={() => setAiEnabled(value => !value)}><span>✦</span> AI Lirik {aiEnabled ? 'ON' : 'OFF'}</button></div>
            {aiEnabled && aiInfo && !aiInfo.configured && <div className="ai-notice">✦ AI lirik belum diaktifkan. Tambahkan <code>GEMINI_API_KEY</code> di Vercel agar pencarian potongan lirik bisa mengenali judul lagu.</div>}
            {aiEnabled && aiInfo?.error && <div className="ai-notice">✦ {aiInfo.error}</div>}
            {aiInfo?.used && <div className="ai-match-banner"><div className="ai-banner-title">✦ AI menemukan kemungkinan lagu</div>{aiInfo.matches.map((match,index) => <div className="ai-match-row" key={match.searchQuery + index}><b>{match.title}</b><span>{match.artist}</span><small>{match.reason}</small></div>)}</div>}
          </section>
        )}

        <section className="catalog-section">
          <div className="section-heading">
            <div><span className="eyebrow">{tab === 'Search' ? 'SEARCH RESULTS' : tab === 'Library' ? 'YOUR COLLECTION' : tab === 'History' ? 'LISTENING HISTORY' : 'CURATED FOR YOU'}</span><h2>{pageTitle}</h2></div>
            <span className="result-count">{visibleTracks.length} lagu</span>
          </div>

          {loading && tab === 'Home' && <div className="status-message"><span className="spinner" /> Memuat katalog musik...</div>}
          {searchLoading && <div className="status-message"><span className="spinner" /> Mencari lagu online...</div>}
          {error && <div className="error-message">{error}<button onClick={() => tab === 'Search' ? setQuery(value => value + ' ') : setReloadKey(value => value + 1)}>Coba lagi</button></div>}
          {tab === 'Search' && query.trim().length < 2 && <div className="empty-state">Ketik nama lagu atau artis di kolom pencarian.</div>}
          {!loading && !searchLoading && !error && visibleTracks.length === 0 && (tab !== 'Search' || query.trim().length >= 2) && <div className="empty-state">{tab === 'Library' ? 'Belum ada lagu favorit. Tekan ikon hati pada lagu.' : tab === 'History' ? 'Lagu yang kamu putar akan muncul di sini.' : 'Belum ada hasil. Coba kata kunci lain.'}</div>}

          <div className="track-grid">
            {visibleTracks.map((track, index) => (
              <article className={'track-card' + (activeTrack?.id === track.id ? ' is-current' : '')} key={track.id}>
                <button className="cover-button" onClick={() => playTrack(track, visibleTracks)} aria-label={track.source === 'apple' ? 'Buka ' + track.title + ' di Apple Music' : 'Putar ' + track.title}>
                  {getArtwork(track) ? <img src={getArtwork(track)} alt="" loading="lazy" /> : <span className="cover-fallback">♫</span>}
                  <span className="cover-overlay">{track.source === 'apple' ? '↗' : activeTrack?.id === track.id && playing ? 'Ⅱ' : '▶'}</span>
                  <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                </button>
                <div className="track-meta">
                  <div className="track-name" title={track.title}>{track.title || 'Untitled track'}</div>
                  <div className="artist-name">{getArtist(track)}</div>
                  <div className="track-stats">{track.source === 'apple' ? 'Katalog ' + (track.country || 'Global') : formatDuration(track.duration) + ' • ' + Number(track.play_count || 0).toLocaleString('id-ID') + ' plays'}</div>
                  {track.source === 'apple' && <a className="store-link" href={track.trackViewUrl} target="_blank" rel="noreferrer">Apple Music ↗</a>}
                  {track.source === 'audius' && <span className="source-link">Bisa diputar</span>}
                </div>
                <button className={'favorite-button' + (isFavorite(track) ? ' liked' : '')} onClick={() => toggleFavorite(track)} aria-label="Tambah ke favorit">{isFavorite(track) ? '♥' : '♡'}</button>
              </article>
            ))}
          </div>
        </section>

        <footer className="footer-note">Yinn Lycs menggabungkan katalog terbuka Audius dan pencarian katalog Apple di beberapa storefront negara. Lagu dari Apple dibuka di layanan resminya; streaming langsung tersedia untuk track Audius yang dapat diputar.</footer>
      </main>

      <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={playNext} onError={() => { setPlaying(false); setError('Stream lagu ini tidak tersedia. Coba lagu lain.') }} />

      <section className="player glass-panel" aria-label="Pemutar musik">
        <div className="player-track">
          <div className="player-art">{activeTrack && getArtwork(activeTrack) ? <img src={getArtwork(activeTrack)} alt="" /> : <span>♫</span>}</div>
          <div className="player-meta"><b>{activeTrack?.title || 'Pilih lagu untuk diputar'}</b><span>{activeTrack ? getArtist(activeTrack) : 'Yinn Lycs • Music online'}</span></div>
          <button className={'player-like' + (activeTrack && isFavorite(activeTrack) ? ' liked' : '')} onClick={() => activeTrack && toggleFavorite(activeTrack)} aria-label="Sukai lagu">{activeTrack && isFavorite(activeTrack) ? '♥' : '♡'}</button>
        </div>
        <div className="player-controls">
          <div className="control-buttons">
            <button onClick={playPrevious} aria-label="Sebelumnya">|◀</button>
            <button className="main-play" onClick={togglePlayback} aria-label={playing ? 'Jeda' : 'Putar'}>{playing ? 'Ⅱ' : '▶'}</button>
            <button onClick={playNext} aria-label="Berikutnya">▶|</button>
          </div>
          <div className="timeline"><span>{formatDuration(currentTime)}</span><input aria-label="Posisi lagu" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={event => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value) }} /><span>{formatDuration(duration)}</span></div>
        </div>
        <div className="volume-control"><span>♪</span><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></div>
      </section>

      <nav className="mobile-nav" aria-label="Navigasi">
        <button className={tab === 'Home' ? 'active' : ''} onClick={() => setTab('Home')}><span>⌂</span><small>Home</small></button>
        <button className={tab === 'Search' ? 'active' : ''} onClick={() => setTab('Search')}><span>⌕</span><small>Cari</small></button>
        <button className={tab === 'Library' ? 'active' : ''} onClick={() => setTab('Library')}><span>♡</span><small>Favorit</small></button>
        <button className={tab === 'History' ? 'active' : ''} onClick={() => setTab('History')}><span>◷</span><small>Riwayat</small></button>
      </nav>
    </div>
  )
}

export default App
