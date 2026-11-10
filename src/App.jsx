
import { useState } from 'react'

const tracks = [
  { id: 1, title: 'Sesi Potret', artist: 'Ari Lesmana', color: 'linear-gradient(135deg,#b7a58c,#51483e)' },
  { id: 2, title: 'Terbelah Jadi Dua', artist: 'The Junas', color: 'linear-gradient(135deg,#0876d8,#062b72)' },
  { id: 3, title: 'Negoro Angin', artist: 'Denny Caknan', color: 'linear-gradient(135deg,#e28c43,#512b27)' },
  { id: 4, title: 'Shape of My Heart', artist: 'Backstreet Boys', color: 'linear-gradient(135deg,#40558f,#080b16)' },
  { id: 5, title: 'Dunia Yang Nanti', artist: 'Musik Indonesia', color: 'linear-gradient(135deg,#f18b42,#702d28)' },
  { id: 6, title: 'Teh Hijau', artist: 'Musik Indonesia', color: 'linear-gradient(135deg,#9da843,#343b16)' }
]

const shortcuts = [
  'DJ TRAP MELODY GTA',
  'Kita usahakan rumah itu',
  'Mesra-mesraannya',
  'Sudah Tahu Tuhan Kita Berbeda',
  'Sesi Potret',
  'Terbelah Jadi Dua'
]

function App() {
  const [activeTab, setActiveTab] = useState('Beranda')
  const [activeTrack, setActiveTrack] = useState(tracks[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [query, setQuery] = useState('')
  const [liked, setLiked] = useState([])

  const filteredTracks = tracks.filter(track =>
    `${track.title} ${track.artist}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  const toggleLike = (id) => {
    setLiked(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="app-shell">

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">♫</span>
          <span>Yinn <b>Lycs</b></span>
        </div>
        <button className="glass-icon" aria-label="Pengaturan">⚙</button>
      </header>

      <main className="main-content">

        <section className="welcome">
          <div className="section-label">YOUR PERSONAL MUSIC SPACE</div>
          <h1>Selamat pagi.</h1>
          <p>Temukan musik yang cocok dengan suasana hatimu.</p>
        </section>

        <section className="shortcut-section">
          <h2>Favorit kamu</h2>
          <div className="shortcut-grid">
            {shortcuts.map((item, index) => (
              <button
                className="shortcut-card glass"
                key={index}
                onClick={() => {
                  setActiveTrack(tracks[index % tracks.length])
                  setIsPlaying(true)
                }}
              >
                <span
                  className="shortcut-art"
                  style={{ background: tracks[index % tracks.length].color }}
                >
                  ♫
                </span>
                <span className="shortcut-title">{item}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mood-section">
          <div className="mood-list">
            {['Sleep', 'Relax', 'Energize', 'Romance', 'Sad'].map(mood => (
              <button className="mood-chip glass" key={mood}>
                {mood}
              </button>
            ))}
          </div>
        </section>

        <section className="music-section">
          <div className="section-heading">
            <div>
              <h2>{activeTab === 'Cari' ? 'Cari musik' : activeTab === 'Pustaka' ? 'Pustaka kamu' : 'Speed dial'}</h2>
              <p>Musik pilihan untuk menemani harimu</p>
            </div>
            <span className="section-more">•••</span>
          </div>

          {activeTab === 'Cari' && (
            <input
              className="search-input glass"
              placeholder="Cari lagu atau artis..."
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          )}

          <div className="music-grid">
            {(activeTab === 'Pustaka'
              ? tracks.filter(track => liked.includes(track.id))
              : filteredTracks
            ).map(track => (
              <article
                className="music-card"
                key={track.id}
              >
                <button
                  className="album-cover"
                  style={{ background: track.color }}
                  onClick={() => {
                    setActiveTrack(track)
                    setIsPlaying(true)
                  }}
                >
                  <span>♫</span>
                  <span className="cover-play">▶</span>
                </button>

                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>

                <button
                  className="like-button"
                  onClick={() => toggleLike(track.id)}
                  aria-label="Sukai lagu"
                >
                  {liked.includes(track.id) ? '♥' : '♡'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="discovery glass">
          <span className="discovery-icon">✦</span>
          <div>
            <b>Discover your sound</b>
            <p>Musik baru, suasana baru, cerita baru.</p>
          </div>
          <span>→</span>
        </section>

      </main>

      <div className="floating-player glass">
        <div
          className="mini-cover"
          style={{ background: activeTrack.color }}
        >
          ♫
        </div>

        <div className="mini-info">
          <b>{activeTrack.title}</b>
          <span>{activeTrack.artist}</span>
        </div>

        <button
          className="player-action"
          onClick={() => toggleLike(activeTrack.id)}
        >
          {liked.includes(activeTrack.id) ? '♥' : '♡'}
        </button>

        <button
          className="play-button"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? 'Ⅱ' : '▶'}
        </button>

        <button
          className="player-action"
          onClick={() => {
            const index = tracks.findIndex(t => t.id === activeTrack.id)
            setActiveTrack(tracks[(index + 1) % tracks.length])
            setIsPlaying(true)
          }}
        >
          » 
        </button>
      </div>

      <nav className="bottom-nav glass">
        {[
          { name: 'Beranda', icon: '⌂' },
          { name: 'Cari', icon: '⌕' },
          { name: 'Pustaka', icon: '♫' }
        ].map(item => (
          <button
            key={item.name}
            className={`nav-item ${activeTab === item.name ? 'active' : ''}`}
            onClick={() => setActiveTab(item.name)}
          >
            <span>{item.icon}</span>
            <small>{item.name}</small>
          </button>
        ))}
      </nav>

    </div>
  )
}

export default App
