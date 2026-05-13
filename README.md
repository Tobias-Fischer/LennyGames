# Police and Crimes

A first-person, Minecraft-style browser game prototype for iPad Safari and desktop browsers.

## Play Online

Once GitHub Pages finishes deploying, open:

https://tobias-fischer.github.io/LennyGames/

## Run Locally

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Build

```sh
npm run build
```

The static output is written to `dist/`. The production build uses a CDN import map for Babylon.js so the app stays small and GitHub Pages-friendly.

## Controls

- iPad: left virtual stick to move, drag on the right side to look, use the large action buttons.
- Desktop: WASD or arrow keys to move, drag/click to look, `E` to use, `F` to enter or exit the car, Space to jump.

## First Playable Loop

- Spawn outside the police station.
- Build and break blocks with the hotbar tools.
- Start a Practice or Actual alarm call.
- Travel to the shop, disarm or stun the criminal, use cuffs, and return them to jail.
- If health reaches zero, respawn at the station with gear restored.

## Theme Packs

Police-specific content lives in `src/themes/police.ts`. The game code consumes the `ThemePack` interface, so future packs like mini McDonalds or army can swap buildings, missions, tools, and entities without changing the core systems.
