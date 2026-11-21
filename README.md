# Lumber Empire

A single-player lumber empire game for iOS, built so it can be developed on Windows.

Start as a lumberjack with a rusty axe. Chop wood, sell it, upgrade your axe, hire helpers, buy better tools, buy more land, build a workshop, and grow into a global timber empire.

## Why this repo is set up this way

Brant has a Windows PC, not a Mac. Xcode only runs on a Mac, so a native Swift app cannot be built on Windows.

This project uses **Expo + React Native + TypeScript** instead. Claude Code can build it fully on Windows, and Expo EAS Build builds the real iPhone version in the cloud for App Store submission. No Mac needed.

## Who does what

- **Muse (this assistant):** game design, balancing, spec, prompts, review. Works from this repo.
- **Claude Code:** the coder. Builds the app on Brant's Windows PC. Works from this repo.

They do NOT talk to each other directly. GitHub is the shared workspace. See `COLLABORATION.md`.

## Quick start for Claude Code on Windows

```bash
git clone https://github.com/<your-username>/lumber-empire.git
cd lumber-empire
npm install
npx expo start
```

To build iOS for the App Store with no Mac:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

You need an Apple Developer account ($99/year) and an Expo / EAS account to submit.

## Game spec

Read `GAME_SPEC.md` first. It is the single source of truth for the game. If the code and the spec disagree, the spec wins unless Brant says otherwise.

## Project structure

```
lumber-empire/
  README.md, GAME_SPEC.md, COLLABORATION.md
  AGENTS.md         - Expo tips for Claude Code
  app.json, eas.json, package.json
  index.ts          - app entry
  assets/           - app icon and splash
  src/
    App.tsx         - top bar, tabs, game loop, autosave, offline earnings
    game/
      data.ts       - ALL prices and balance numbers live here
      logic.ts      - game rules (chop, sell, repair, golden trees, purchases)
      store.ts, save.ts, format.ts, rate.ts
    components/     - TopBar, ChopScreen, Tree, UpgradesScreen, ShopScreen, TabBar
    services/
      purchases.ts  - real App Store purchases via RevenueCat
      haptics.ts
  scripts/
    check-logic.ts  - npm test
    pacing-sim.ts   - npm run pacing (how long each upgrade takes)
  docs/
    STORE_SETUP.md  - App Store Connect, RevenueCat, TestFlight steps
```

## Status

- Spec: complete, in `GAME_SPEC.md` (Balance v2, a little harder, in section 0)
- Built (part 1): Chop screen, top bar (Money, Gold, Wood, wood/sec, Empire Rank + progress), Upgrades tab (axes, durability, repair), Shop tab (all App Store products, Buy, Restore, VIP daily Gold), price slider for selling wood, golden trees, autosave every 10 seconds, offline sales.
- Expo SDK 58. Typecheck, iOS bundle, web preview and logic tests all pass.
- Not built yet: Helpers, Tools, Land, Market tab, Workshop, Empire Map, Leaderboard, weather, sounds.
- App Store: not submitted yet. See `docs/STORE_SETUP.md`.

## Testing on your iPhone

Fast way (no purchases): install **Expo Go** from the App Store, run `npx expo start` on the PC, and scan the QR code with the iPhone camera. Phone and PC must be on the same Wi-Fi.

Real app (purchases work): `npx eas-cli@latest build --platform ios --profile production`, then `npx eas-cli@latest submit --platform ios` and install from TestFlight.

Developer test trick: in Expo Go / development builds only, press and hold the tree for 1.5 seconds to make a Golden Tree. This does not exist in the App Store build.

## Commands

```bash
npm install          # once
npx expo start       # run the game (press w for a browser preview)
npm run typecheck    # check for code errors
npm test             # check game rules
npm run pacing       # see how long upgrades take
```
