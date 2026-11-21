# How Muse and Claude Code work together

Brant has Windows, not a Mac. Muse runs on Linux in the cloud. Claude Code runs on Brant's Windows PC.

They cannot talk to each other directly, and neither one can see the other's computer. GitHub is the shared workspace.

## Roles

### Muse - planner and designer
- Keeps the game spec in `GAME_SPEC.md` up to date.
- Does balancing for Money, Gold, prices, durability, and land.
- Writes prompts for Claude Code for each new feature.
- Reviews code Claude Code pushes, spots bugs and missing features.
- Does not build the iOS app directly, because Muse cannot run Xcode.

### Claude Code - coder
- Builds the app on Brant's Windows PC using Expo + React Native.
- Builds iOS in the cloud with EAS Build, no Mac needed.
- Pushes every working change to GitHub.
- Does not change the game design without Brant saying so. If the spec and the code disagree, ask Brant.

### Brant - owner and decider
- Decides what gets built next.
- Tests the app on his phone.
- Approves any big change to prices, currencies, or features.

## Workflow

1. Brant tells Muse what he wants next.
2. Muse updates `GAME_SPEC.md` and writes a prompt for Claude Code.
3. Brant pastes that prompt into Claude Code on his Windows PC.
4. Claude Code builds it, tests it with `npx expo start`, and pushes to GitHub.
5. Brant tells Muse what Claude Code finished, or Muse pulls the latest code from GitHub to review.
6. Muse writes the next prompt. Repeat.

## Git rules

- Main branch is `main`. It should always be working, or close to working.
- Claude Code works on a feature branch, like `feature/land-bidding`, then merges to `main` when it works.
- Every commit message says what changed in plain words, for example: `Add land negotiation with AI rivals`.
- Never commit secrets, API keys, Apple passwords, or RevenueCat keys. Those go in `.env` on the local PC only, and `.env` is in `.gitignore`.
- Never commit `node_modules`, build folders, or `.expo`.

## First setup on Windows - for Claude Code

Brant needs to do this once, on his Windows PC:

1. Create a free GitHub account if he does not have one.
2. Create a new empty repo on github.com named `lumber-empire`. Do NOT add a README there, this repo already has one.
3. Install on Windows: Git, Node.js LTS, and Claude Code.
4. In Claude Code, run:

```bash
git clone https://github.com/<your-username>/lumber-empire.git
cd lumber-empire
npm install
npx expo start
```

5. To push changes back:

```bash
git add .
git commit -m "Describe what changed"
git push
```

Muse's copy of the repo lives in `~/workspace/lumber-empire` on Muse's computer. It is the same project, just a local copy until Brant creates the GitHub repo and pushes it there. Once the GitHub repo exists, both Muse and Claude Code pull from the same remote.

## What to do if something breaks

- If Expo will not start on Windows, Claude Code should fix the Node / Expo setup first, before adding new game features.
- If iOS build fails in EAS, Claude Code should read the EAS build log and fix the error it names.
- If a purchase does not work, check App Store Connect first. The product IDs in `GAME_SPEC.md` must match exactly in App Store Connect, with the same prices.
