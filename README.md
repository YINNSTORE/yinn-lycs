# Yinn Lycs

Personal music discovery and streaming web app built with React, Vite, and Vercel Functions.

## v1.1.0

- Search across Audius and Apple/iTunes music catalogs in 8 storefronts (Indonesia, United States, United Kingdom, Japan, South Korea, Australia, India, and Brazil).
- Optional AI lyric-fragment identification using Gemini with Google Search grounding.
- Real streaming playback for playable Audius tracks.
- Apple catalog results open their official Apple/iTunes destination; they are not streamed inside Yinn Lycs.
- Theme presets: Liquid Glass, Midnight, and Light, plus custom accent color.
- Favorites and listening history are stored in the current browser.

## AI lyric search setup

AI lyric identification requires a Gemini API key.

1. Create a key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the Yinn Lycs project in Vercel.
3. Go to **Settings → Environment Variables**.
4. Add **GEMINI_API_KEY** with your key as the value.
5. Enable it for **Production** (and Preview if desired), then save.
6. Redeploy the project so the new environment variable is available to the function.

Never put the Gemini key in frontend code or commit it to GitHub. The key is read only by the serverless function.

The AI feature uses Gemini 2.5 Flash and Google Search grounding to identify a likely song from a short lyric fragment. Results are suggestions and may not always be correct. Google Search grounding may incur API usage charges; check Google's current pricing and limits.

## Music catalog and playback notes

Yinn Lycs combines:
- **Audius** for open-catalog music discovery and direct playback when the track is streamable.
- **Apple/iTunes Search API** for broader international catalog metadata and official store links.

No single free API guarantees every song worldwide. Apple catalog entries are linked to their official destination and are not played as audio inside this app. Availability depends on each storefront and rights holder.

## Development

- Install dependencies with **npm install**.
- Start Vite with **npm run dev**.
- Build with **npm run build**.

Vercel serves the /api directory as serverless functions. For local API testing, use the Vercel CLI (vercel dev) after linking the project.

## Privacy

Favorites, recent listening history, theme choice, and accent color are stored locally in the browser. They are not synced between devices.