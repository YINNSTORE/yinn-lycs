# Yinn Lycs

Personal music discovery and streaming web app built with React, Vite, and Vercel Functions.

## v2.0.0

- Redesigned mobile-first Liquid Glass interface inspired by the supplied player screenshots.
- Collapsible bottom navigation and attached mini-player while scrolling.
- Full player with seek and volume controls; lyrics, queue, share and sleep timer shortcuts.
- 16 font choices, font-weight control, theme presets, custom accent colors and night mode.
- In-app Dynamic Island, Ambient mode, optional animated artwork and Auralys Glass widget card.
- Listening Recap for this year, last 30 days and all time, with shareable poster.
- Search page sections for recent plays, most-played tracks, favorite artists and genres.
- Playlist import UI for Spotify and Apple Music links (provider credentials required).
- Lyrics lookup through LRCLIB and Google Translate without a key; optional Gemini and DeepL translation.
- Search AI is disabled in v2.

## Provider configuration

Add secrets in Vercel → Project → Settings → Environment Variables. Never commit keys to GitHub.

| Variable | Purpose | Required |
| --- | --- | --- |
| SPOTIFY_CLIENT_ID | Read public Spotify playlist metadata | For Spotify import |
| SPOTIFY_CLIENT_SECRET | Server-side Spotify client credentials | For Spotify import |
| APPLE_MUSIC_DEVELOPER_TOKEN | Apple Music catalog playlist metadata | For Apple Music import |
| GEMINI_API_KEY | Optional Gemini lyrics translation | Optional |
| DEEPL_API_KEY | Optional DeepL translation | Optional |

After adding or changing variables, redeploy the Vercel project.

Spotify playlist access is subject to Spotify authorization and playlist access restrictions. The app imports metadata only; Spotify audio is never downloaded or streamed by Yinn Lycs. Apple Music import also reads metadata only; playback opens the provider's official page.

## Lyrics and translation

LRCLIB provides lyrics when a matching record is available. Google translation is offered without an API key through its public web translation endpoint; availability and rate limits are controlled by that service. Gemini and DeepL require the environment variables above.

## Important platform limits

- Dynamic Island is an in-page web UI, not an Android system-wide floating overlay. Browser Media Session controls may appear on supported Android lock screens.
- The Auralys Glass widget is an in-app widget card. A real Android home-screen widget requires a native Android application.
- Full Liquid Glass blur is enabled when browser support and Android version detection indicate compatibility; older Android browsers use a lighter glass fallback.
- Recap statistics are stored locally in this browser and start counting v2 play events after the update. They do not sync across devices.
- Offline downloads are not enabled. The library shows offline/cache placeholders rather than downloading copyrighted audio.
- Audius tracks can play in-app when their stream is available. Spotify and Apple Music imported tracks are metadata and official provider links, not in-app audio.

## Development

- `npm install`
- `npm run dev` for the Vite frontend
- `npm run build` to create the production bundle
- Use `vercel dev` to test `/api` serverless functions locally after linking the project.

## Privacy

Favorites, listening history, play events, imported playlist metadata, theme, font, and settings are stored in local browser storage. They are not synced between devices.