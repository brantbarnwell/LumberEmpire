# App Store and purchases setup

The Shop uses **RevenueCat** on top of Apple's StoreKit 2. Every purchase goes through Apple. The code is in `src/services/purchases.ts`. Products and what they give are in `src/game/data.ts`.

Purchases do **not** work in Expo Go or the web preview. The Shop says so and shows a message when you tap Buy. They work in a real build (TestFlight or the App Store).

## 1. Apple Developer and App Store Connect (Brant)

1. Join the Apple Developer Program ($99/year) at developer.apple.com.
2. In App Store Connect, create the app: name **Lumber Empire**, bundle ID **com.lumberempire.game**.
3. Agreements, Tax, and Banking: accept the Paid Apps agreement. Purchases will not load until this is done.
4. In the app, go to Monetization and create these products with these exact IDs and prices:

| Product ID | Type | Price |
|---|---|---|
| com.lumberempire.gold100 | Consumable | $0.99 |
| com.lumberempire.gold550 | Consumable | $4.99 |
| com.lumberempire.gold1200 | Consumable | $9.99 |
| com.lumberempire.gold3000 | Consumable | $19.99 |
| com.lumberempire.gold7000 | Consumable | $49.99 |
| com.lumberempire.gold15000 | Consumable | $99.99 |
| com.lumberempire.starterpack | Non-Consumable | $4.99 |
| com.lumberempire.propack | Non-Consumable | $19.99 |
| com.lumberempire.megapack | Non-Consumable | $49.99 |
| com.lumberempire.landpack | Non-Consumable | $29.99 |
| com.lumberempire.noads | Non-Consumable | $4.99 |
| com.lumberempire.vip.monthly | Auto-Renewable Subscription (group "VIP") | $9.99 / month |
| com.lumberempire.vip.yearly | Auto-Renewable Subscription (group "VIP") | $59.99 / year |

5. Users and Access > Sandbox: create a Sandbox tester (a new email you don't use for anything else). On the iPhone: Settings > App Store > Sandbox Account, sign in with it. Sandbox purchases are free.

## 2. RevenueCat (free to start)

1. Make an account at revenuecat.com and create a project.
2. Add an Apple App Store app with bundle ID com.lumberempire.game and connect it to App Store Connect (RevenueCat walks you through the In-App Purchase key).
3. Import the 13 products above.
4. Create an Entitlement with the identifier **vip** and attach both VIP subscriptions to it.
5. Copy the **Apple public SDK key** (starts with `appl_`).

## 3. Put the key in the build (never in git)

Local testing: copy `.env.example` to `.env` and paste the key.

EAS cloud builds: run once:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_XXXX --environment production --environment preview --environment development --visibility plaintext
```

## 4. Build and test on iPhone with no Mac

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```

Then open TestFlight on the iPhone, install Lumber Empire, open the Shop, and buy something with the Sandbox account. Check: Gold goes up, Restore Purchases brings back one-time packs and VIP, cancelling shows "Purchase cancelled."

A development build (`--profile development`) also works and lets you use `npx expo start` with real purchases.

## Notes

- Gold packs are consumable. Apple does not restore them, that is normal.
- Each Apple transaction is only granted once, tracked in the save file.
- Helpers, Sawmill and Redwood Forest from packs are saved now and handed out when those features are built.
- Xcode StoreKit Configuration files need a Mac, so we test with Sandbox and TestFlight instead.
