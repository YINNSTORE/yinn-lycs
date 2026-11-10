# Changelog

## [1.1.0] — Global Search & AI Lyrics

### Added
- AI-assisted song identification from short lyric fragments using Gemini 2.5 Flash and Google Search grounding.
- Cross-store catalog search across Audius and Apple/iTunes storefronts in Indonesia, United States, United Kingdom, Japan, South Korea, Australia, India, and Brazil.
- Apple/iTunes catalog result cards with official store links.
- AI lyric search on/off control and candidate match explanations.

### Improved
- More polished search experience with separate source labels for playable Audius tracks and Apple catalog entries.
- Theme customization with Liquid Glass, Midnight, and Light modes.
- Quick accent-color presets and a dedicated night-mode control.
- Clearer playback and catalog availability messaging.

### Playback and availability
- Audius tracks that expose a stream remain playable in Yinn Lycs.
- Apple/iTunes results are catalog discovery links and open in the official store; they are not streamed in-app.
- AI lyric search requires the GEMINI_API_KEY environment variable in Vercel.
- Favorites, listening history, and theme settings remain browser-local.