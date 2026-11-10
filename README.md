# Yinn Lycs

Personal music discovery and streaming web app built with React, Vite, and Vercel Functions.

## v2.0.2

- Search results come only from Audius.
- Every playable song is streamed by the native Yinn Lycs HTML5 audio player through the server-side Audius API proxy.
- No third-party embedded player is used.
- Spotify playlist import is metadata-only; imported tracks are matched against Audius before playback.
- Audius search merges both discovery providers and filters tracks that are gated or not streamable.
- Stream requests forward audio range headers and preserve partial-content responses where available.
- Keeps the v2 Liquid Glass interface, themes, font settings, listening recap, lyrics, queue, sleep timer and library.

## Provider configuration

Add secrets in Vercel → Project → Settings → Environment Variables. Never commit keys to GitHub.

| Variable | Purpose | Required |
| --- | --- | --- |
| AUDIUS_API_BEARER_TOKEN | Server-side Audius Bearer token for catalog and stream requests | Recommended |
| SPOTIFY_CLIENT_ID | Read public Spotify playlist metadata | Optional, Spotify import only |
| SPOTIFY_CLIENT_SECRET | Server-side Spotify client credentials | Optional, Spotify import only |
| GEMINI_API_KEY | Optional Gemini lyrics translation | Optional |
| DEEPL_API_KEY | Optional DeepL translation | Optional |

For Audius, create the variable name exactly as `AUDIUS_API_BEARER_TOKEN` and paste only the token value (without the `Bearer ` prefix). The token is read only by the Vercel serverless API and is never sent to the browser.

## Playback model

Yinn Lycs owns the playback interface and controls. The browser plays audio through its native HTML5 audio element; the Vercel API proxies Audius stream requests and keeps the Audius Bearer Token server-side.

Search results are limited to public, streamable, non-gated tracks available in Audius. Imported Spotify playlist entries are metadata only and must be matched to a streamable Audius upload before they can play. The app does not embed or redirect to an external music player.

Audius is an open music catalog, not a universal index of every commercial recording. If a recording is not available as a streamable upload in Audius, Yinn Lycs cannot stream it through the Audius API. A future expansion can add other licensed/open catalogs while keeping the same Yinn Lycs player.

## Lyrics and translation

LRCLIB provides lyrics when a matching record is available. Google translation is offered without an API key through its public web translation endpoint; availability and rate limits are controlled by that service. Gemini and DeepL require the environment variables above.

## Platform notes

- Dynamic Island is an in-page web UI, not an Android system-wide floating overlay. Browser Media Session controls may appear on supported Android lock screens.
- The Auralys Glass widget is an in-app widget card. A real Android home-screen widget requires a native Android application.
- Full Liquid Glass blur depends on browser support; older Android versions use the lightweight glass fallback.
