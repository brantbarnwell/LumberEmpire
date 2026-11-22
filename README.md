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
      logic.ts      - game rules (chop, sell, helpers, land deals, workshop, offline)
      meta.ts       - daily rewards, quests, video rewards, Gold shop, prestige
      store.ts, save.ts, format.ts, rate.ts
    components/     - one file per screen (Chop, Upgrades, Helpers, Land, Workshop, Goals, Shop) + TopBar, TabBar, WelcomeBack
    services/
      purchases.ts  - real App Store purchases via RevenueCat
      ads.ts        - opt-in rewarded videos (AdMob); ads.web.ts for the browser preview
      notify.ts     - local notifications; notify-plan.ts has the timing rules
      haptics.ts
  scripts/
    check-logic.ts  - npm test
    pacing-sim.ts   - npm run pacing (how long each upgrade takes)
  docs/
    STORE_SETUP.md  - App Store Connect, RevenueCat, TestFlight steps
```

## Status

- Part 1: Chop screen, top bar, axes and repairs, wood selling with a price slider, golden trees, Shop with App Store purchases.
- Part 2: Helpers (hire copies, level up 10 times), Land (seller negotiation, reputation, land upgrades), Workshop (8 buildings, 24 crafted items, selling items with sell chance and time).
- Part 3: opt-in video rewards (Welcome Back 2x, 2x wood 30 min, 5 free Gold videos a day), VIP $4.99 / $39.99, 7-day daily rewards, daily and weekly quests, weekend Timber Rush, prestige (Timber Baron), push notifications, Gold shop for time boosts.
- Part 4: packs fixed (no power for money), Tools with durability and repairs, helper wages, wood storage limit and upgrades, ranks up to $200M.
- Part 5: Market tab (wood, planks, furniture, demand, news, bulk orders, 7-day graph), Golden Chainsaw ($500,000 or 1,500 Gold).
- Typecheck, 65 logic tests, iOS bundle and web click-through all pass. `npm run price-test` shows how price changes selling.
- Not built yet: AI rival companies and land auctions, manager helper, wood quality, Buildings (Sawmill etc), Empire Map, Leaderboard, weather, sounds, achievements.

## Testing on your iPhone

Fast way (no purchases): install **Expo Go** from the App Store, run `npx expo start` on the PC, and scan the QR code with the iPhone camera. Phone and PC must be on the same Wi-Fi.

Real app (purchases work): `npx eas-cli@latest build --platform ios --profile production`, then `npx eas-cli@latest submit --platform ios` and install from TestFlight.

Videos and notifications need a real build (TestFlight or development build), not Expo Go.

Developer test trick: in Expo Go / development builds only, press and hold the tree for 1.5 seconds to make a Golden Tree. This does not exist in the App Store build.

## Commands

```bash
npm install          # once
npx expo start       # run the game (press w for a browser preview)
npm run typecheck    # check for code errors
npm test             # check game rules
npm run pacing       # see how long upgrades take
npm run price-test   # see how price changes selling
```
