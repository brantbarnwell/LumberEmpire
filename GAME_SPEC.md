# Lumber Empire - Game Spec

This is the single source of truth. Claude Code: build exactly this. Muse: use this to review and plan next steps.

## 0. Balance v2 - a little harder (Brant, Nov 2026)

- All Money prices are about 20% higher than the first draft. Helpers, land and workshop were raised again in section 16.
- Rusty Axe starts at 0.8 wood per chop. Stone Axe is $75 and Iron Axe is $350 (a bit more than +20%).
- Wood sells for about $0.12 at normal demand (player still sets the price with the slider).
- Pacing targets: first axe about 5 minutes, first helper about 20 minutes, first land about 1 hour, first workshop about 2 hours.
- The player should still feel progress every few minutes. If the first 10 minutes feel slow, it is too hard.
- Real-money App Store prices and Gold pack amounts are NOT changed.

## 1. Platform

- Expo + React Native + TypeScript, iOS 17 and later, iPhone and iPad, portrait mode.
- Built on Windows with Claude Code. iOS builds use Expo EAS Build in the cloud, no Mac needed.
- Single-player only. No real-time multiplayer, no live PvP, no playing against real people, no chat.

## 2. Currencies - do not mix these up

### Money, shown as $
- Main in-game currency.
- Earned by selling wood, planks, furniture, chairs, tables, and sculptures at the price the player sets.
- Used for: helpers, tools, repairs, land offers and land auction bids, buildings, helper wages.
- Land offers and bids use Money only. Never use Gold or real dollars to bid on land.

### Gold
- Premium currency, bought with real money.
- Replaces Gems completely. There are no Gems in this game.
- Gold is for speeding things up and cosmetics only.
- What Gold can buy: instantly finish a building upgrade, instantly grow trees, instantly finish helper training, instantly repair all tools, 2x Wood Boost for 1 hour or 24 hours, 2x Money Boost, extra storage, unlock premium land instantly.
- Cosmetics with Gold: axe skins (Fire Axe, Ice Axe, Dragon Axe, Golden Axe), helper outfits, truck skins, forest themes, tree skins, profile frames. Cosmetics are visual only, except for the special Gold axes.
- VIP gives 100 Gold per day, 2x earnings, and exclusive VIP cosmetics.

### Real dollars, USD
- Real money is only used in the App Store Shop to buy Gold packs, Starter Packs, and VIP.
- Real dollars are never used directly in gameplay, never used to bid on land, and never used to buy wood or helpers directly.

Top bar must show clearly: Money as $1,250, Gold with a gold coin icon, and a Shop button.

## 3. In-app purchases - real money, StoreKit via Expo / RevenueCat

Use Expo in-app purchases / RevenueCat with StoreKit 2 on iOS. Do not use fake money or fake purchase buttons. Every purchase must go through Apple.

Gold packs:
- com.lumberempire.gold100 - 100 Gold - $0.99
- com.lumberempire.gold550 - 550 Gold - $4.99
- com.lumberempire.gold1200 - 1200 Gold - $9.99
- com.lumberempire.gold3000 - 3000 Gold - $19.99
- com.lumberempire.gold7000 - 7000 Gold - $49.99
- com.lumberempire.gold15000 - 15000 Gold - $99.99

One-time packs:
- com.lumberempire.starterpack - Starter Pack - $4.99 - 500 Gold, Steel Axe skin, 2x Wood for 24 hours
- com.lumberempire.propack - Pro Logger Pack - $19.99 - 2500 Gold, Diamond Axe, 3 helpers, 2x Money for 7 days
- com.lumberempire.megapack - Empire Pack - $49.99 - 7000 Gold, Dragon Axe, Sawmill, 5x Wood for 7 days
- com.lumberempire.landpack - Land Baron Pack - $29.99 - unlocks Redwood Forest instantly, 1000 Gold, 10 helpers
- com.lumberempire.noads - Remove Ads - $4.99 - one-time, removes all ads forever

Subscriptions:
- com.lumberempire.vip.monthly - VIP Tycoon Monthly - $4.99 per month
- com.lumberempire.vip.yearly - VIP Tycoon Yearly - $39.99 per year
- VIP: 2x earnings, 100 free Gold every day, exclusive VIP cosmetics, no ads (video rewards are instant).

Shop tab must show all packs with real dollar prices, working Buy buttons, a Restore Purchases button, loading states, success and error messages. Include a StoreKit Configuration / sandbox test setup for testing. Brant must create these same products with the same IDs and prices in App Store Connect before real money works.

## 4. Core loop

Tap the tree to chop wood. Sell wood for Money. Spend Money on helpers, tools, and land. Earn more wood and Money automatically. Buy even bigger helpers, tools, and land.

## 5. Axe upgrades

Rusty Axe (start, 0.8 wood per chop), Stone Axe $75 (2), Iron Axe $350 (5), Steel Axe $1,200 (12), Titanium Axe $6,000 (30), Diamond Axe $30,000 (75), Mythic Golden Axe $120,000 (200). Plus Gold-only exclusive axes. Add swing speed upgrades and critical chops, 10% chance for 5x wood.

## 6. Helpers - lumber helping hands

Helpers tab. Helpers chop automatically every second, even when the player is not tapping.

- Apprentice Helper - $450 - 2 wood/sec
- Lumberjack Helper - $1,500 - 5 wood/sec
- Veteran Logger - $6,000 - 15 wood/sec
- Tree Feller Pro - $30,000 - 50 wood/sec
- Master Lumberjack - $150,000 - 200 wood/sec
- Elite Logging Crew - $750,000 - 1,000 wood/sec

Each helper can be leveled up 10 times. Each level is +25% output and costs more Money. Player can hire multiple copies. Helpers appear working in the forest. Add a manager helper that auto-sells wood and auto-collects Money.

## 7. Tools and equipment, with durability

Tools boost the player and all helpers.

- Sharpening Stone $120, +10% wood per chop
- Hand Saw $360, +1 wood per chop
- Heavy Duty Axe Handle $960, +20% chop speed
- Chainsaw $1,800, +5 wood per chop and +20% chop speed
- Log Splitter $6,000, doubles Money from selling planks
- Wood Chipper $14,400, +15% wood from every chop
- Logging Truck $30,000, auto-sells wood for +50% Money, unlocks deliveries
- Crane $90,000, +100 wood/sec for all helpers
- Harvester Machine $240,000, +500 wood/sec, chops whole trees at once
- Golden Chainsaw, Gold only, +100 wood per chop

Equipment can be equipped to the player and to helpers. A helper with a chainsaw works 2x faster than a helper with no tool.

### Durability and repairs
Every axe and tool starts at 100% durability and wears out with use.
- Rusty Axe loses 1% every 20 chops, Iron Axe 1% every 15 chops, Chainsaw 1% every 10 chops, Harvester 1% every 5 uses.
- Show a durability bar under every tool. Green 100-50%, yellow 49-25%, red under 25%.
- At 50% durability it works at 75% power. At 25% it works at 50% power and shows a warning.
- At 0% the tool is broken, gives 0 bonus, is greyed out, and helpers using it stop working until repaired.
- Repairs cost Money only, not Gold and not real dollars. Repair button on each tool, Repair All button in Tools tab.
- Repair cost scales with tier. Examples: Rusty Axe $12, Iron Axe $90, Chainsaw $300, Logging Truck $1,200, Harvester Machine $6,000. Partial repair to 50% is allowed for a smaller amount.
- Repair Shop building: each level makes all repairs 10% cheaper.
- If a helper's tool breaks, that helper's wood/sec drops to 0 until repaired, with a red wrench icon.
- Gold repair option only: pay 10 Gold to instantly repair all tools to 100% with no Money cost.

## 8. Land - buy more land, with negotiation

Land tab and Empire Map. Land increases max wood storage, unlocks new tree types, and produces passive wood. Land can be upgraded with Plant Trees, Fertilizer, and Irrigation. Trees get chopped down and regrow, so the player must plant new trees or buy more land.

Land list:
- Small Clearing $3,000, 10 trees, +5 wood/sec
- Pine Grove $15,000, 25 trees, +20 wood/sec
- Hillside Forest $60,000, 50 trees, +75 wood/sec
- River Valley Forest $225,000, 100 trees, +250 wood/sec
- Redwood Forest $750,000, 250 trees, +800 wood/sec, unlocks rare redwood
- Mountain Timberland $3,000,000, 500 trees, +3,000 wood/sec
- Global Timber Estate, Gold only, +10,000 wood/sec

More land means more trees for helpers to chop. Better tools mean helpers chop faster.

### Land negotiation - offer, accept or reject
The player does NOT just click Buy Now for land. Every piece of land is owned by a seller and the player must make an offer in Money.
- Each listing shows land name, acres, trees, wood type, asking price, seller name, and seller personality.
- Personalities: Flexible Seller accepts close to asking, Stubborn Seller wants full price or more, Desperate Seller accepts a low offer, Greedy Seller always counters high.
- Each seller has a secret minimum price. The player does not see it.
- Player types their own offer in Money and taps Make Offer.
- Seller can Accept, Reject, or Counteroffer. Player can Accept, Reject, or counter again.
- If the offer is way too low, seller mood drops, they raise their price or walk away.
- If rejected 3 times on the same land, that seller walks away and the land is gone for 24 hours.
- Show Seller Mood meter and Negotiation History.
- Reputation score: fair offers raise reputation and future sellers accept lower offers. Lowballing everyone lowers reputation and sellers demand more.

### Competing buyers - AI only, not real people
The player competes against AI rival lumber companies only: Timber Titans Inc, Redwood Corp, Big Pine Logging, Mountain Wood Co. They are bots, not real players.
- Each rival has its own budget and bidding style. Some bid fast, some wait until the last second.
- Live activity feed: "Timber Titans just offered $48,000 for Pine Grove", "Redwood Corp outbid you by $2,000".
- Some land is a timed auction with a 60 second countdown, current highest bid, and who is winning. If a rival outbids the player, the player gets a notification and 10 seconds to bid higher or lose the land.
- Some land is first come, first served. If the player takes too long, a rival can buy it and it disappears.
- New land listings every day, sold land is removed. Player can watch land they want.

## 9. Market - set your own price with a slider

Do not use a fixed sell price. The player sets their own price for wood, planks, furniture, chairs, tables, and sculptures, and that price affects how much they sell.

- Market tab: set price per unit with a slider and a text field.
- Show average market price from competitors, current demand, and a Demand Meter from Low to Very High.
- Supply and demand: high price = more Money per sale but fewer units and slower. Low price = less per sale but more units and faster.
- Example: at $10 per wood with high demand, sell 100 wood per hour. At $20, sell only 30 per hour. At $5, sell 200 per hour but make less profit. Show this live forecast before confirming.
- Show Estimated Sales Per Hour, Estimated Profit Per Hour, and Units Sold Today.
- Demand changes every day based on season, weather, news events, and competitor prices. Events like "Housing Boom: Demand up 50%" and "Market Crash: Demand down, lower your price to sell".
- If price is too high, wood sits unsold, storage fills up, player must lower price or run a sale. If price is too low, they sell out fast and lose profit.
- Competitors also set prices. If a rival sets a lower price, they steal customers unless the player's wood quality or reputation is higher.
- Bulk Orders and Contracts: a buyer offers to buy 1,000 wood at a fixed price, player can accept, reject, or negotiate.
- Sales graph for the last 7 days: wood sold, Money earned, price.
- Wood quality: Regular, Premium, Rare. Higher quality can be sold for a higher price.

### Price slider for every sale
Every time the player sells something, they set the price with a slider. The higher the price, the less likely it is to sell.
- Sell screen shows slider from very cheap to very expensive, base market price in the middle.
- Show live: Sell Chance %, Estimated Time To Sell, Estimated Profit.
- Example for a Wooden Chair, base $50: at $25 sell chance 95% in about 5 minutes, at $50 sell chance 70% in about 1 hour, at $100 sell chance 30% in about 6 hours, at $200 sell chance 5% and it might never sell.
- If an item does not sell, it stays in shop inventory. Player can lower the price at any time.
- Demand, weather, and item quality affect sell chance.
- Sales History: what sold, for what price, how long it took. Best Price hint showing the price with the best profit per hour.

## 10. Buildings and empire progression

Buildings: Sawmill, Lumber Yard, Warehouse, Furniture Factory, Lumber Store, Trucking Company.
Empire ranks: Solo Lumberjack, Sawmill Owner, Logging Company, Timber Business, Lumber Empire, Global Timber Tycoon.
Prestige: after $1,000,000, Prestige to Timber Baron, reset progress, get permanent 2x earnings and a prestige badge.
Crafting: turn wood into planks, then furniture, then houses for higher profit.
Daily quests, daily login rewards, 50+ achievements, seasonal events, offline earnings.

## 11. Weather events

Live weather that changes gameplay. Forecast for today and tomorrow at the top of the Chop screen. Banner when weather changes. Weather changes every 2 to 4 hours in game time.

- Sunny Day: +10% chop speed, normal demand
- Rainy Day: -10% chop speed, trees grow 50% faster, helpers slower
- Storm: -30% chop speed, helpers stop for safety, fallen trees give bonus wood after the storm
- Snow: -20% chop speed, demand for firewood up 50%
- Heatwave: helpers tire faster, tools lose durability 25% faster, demand drops
- Windy Day: +15% wood per chop, -10% accuracy
- Perfect Weather: +25% chop speed and +25% wood for 1 hour, rare

Weather affects chopping, selling, and the price the player should set.

## 12. Rare golden trees

- Spawn chance about 1 in 500 trees, 0.2% when a new tree grows. Fully random, cannot be farmed.
- Golden tree glows gold, sparkles, has a gold icon, and makes a special sound.
- Only stays for 60 seconds. If not chopped in time, it disappears.
- If chopped down, player gets a small amount of Gold only, 3 to 10 Gold random. Keep the reward small.
- Also gives bonus Money and golden wood.
- Pop up: "You found a Golden Tree! +7 Gold". Add to Golden Trees Found counter in achievements.

## 13. Workshop building chain - shed to factory

Crafting building chain, bought and upgraded with Money. Each upgrade makes more Money and unlocks new things to build and sell.

1. Backyard Shed $600 (locked until you own your first land), slow crafting, 1 slot
2. Work Trailer $5,000, faster, 2 slots, unlocks tables
3. Small Workshop $20,000, 3 slots, unlocks desks and bookshelves
4. Lumber Shop $80,000, 4 slots, unlocks cabinets and dining tables, customers can visit
5. Warehouse $300,000, 5 slots, bulk crafting, storage for 500 finished items
6. Furniture Factory $1,000,000, 6 slots, fast crafting, unlocks sculptures
7. Timber Plant $3,000,000, 8 slots, very fast, unlocks luxury furniture
8. Global Manufacturing Hub $10,000,000, 10 slots, instant crafting boost, unlocks masterpiece sculptures

Each upgrade costs more Money, takes time to build unless sped up with Gold, increases crafting speed, slots, quality, and sell value.

Craftable items, in order:
- Shed: Wooden Stool, Birdhouse, Wooden Chair
- Trailer: Small Table, Bench, Wooden Crate
- Workshop: Coffee Table, Bookshelf, Bed Frame
- Shop: Dining Table, Cabinet, Office Desk
- Warehouse: Large Dining Set, Wardrobe, Garden Bench Set
- Factory: Wood Sculpture, Luxury Chair, Carved Table
- Timber Plant: Art Sculpture, Luxury Bed Set, Designer Furniture
- Global Hub: Masterpiece Sculpture, Royal Furniture Set, Custom Art Piece

Each item needs a set amount of wood, takes time to craft, and uses tool durability. Higher tier items need rarer wood and more time, but sell for much more Money. Show recipe, wood needed, time needed, and base value. Craft button, crafting queue, finished items inventory.

## 14. Leaderboard - who is winning and where you rank

No multiplayer. Leaderboard is a ranking list only, not live play against real people.

- Use Game Center on iOS where possible, with an async leaderboard. If Expo / Game Center is not available, use a cloud leaderboard service and fall back to a local AI leaderboard so the screen is never empty.
- Leaderboards: Total Money Earned all time, Most Wood Chopped all time, Highest Empire Rank, Most Money Earned This Week.
- Top 100 players for the selected leaderboard.
- Top 3 get a podium with 1st, 2nd, 3rd, gold, silver, bronze.
- List below with Rank number, player name, empire level, total Money earned, total wood chopped.
- Always show the player's own row, highlighted, even if they are rank 87. Show exact rank, like "You are Rank #42 out of 10,000 players".
- Show how much Money or wood is needed to pass the player directly above them, like "Earn $12,500 more to pass RedwoodKing99".
- Filter for All Time, This Week, and Friends Only.
- Pull to refresh. Sign In to Game Center button if not signed in.
- If not signed in or offline, show a local AI leaderboard with fake AI lumber tycoons and the player's rank among them. Label this clearly as Local Rankings.
- Leaderboard must update automatically when the player earns Money and chops wood, and the player's rank must always be visible.

## 15. Design and polish

- Forest theme, green and brown, polished UI, big tappable tree with shake and particle animations, floating +wood text, haptics on chop and purchase, sound effects with mute button.
- Tabs: Chop, Helpers, Tools, Land, Upgrades, Shop, Market, Workshop, Empire Map, Leaderboard.
- Top bar for Money, Gold, Wood, Wood Per Second, Empire Rank.
- Progress bar to next empire rank.
- Save locally, autosave every 10 seconds, offline earnings when the player returns.
- Works on iPhone and iPad, portrait mode.
- Every button must work. No placeholder or fake functionality.


## 16. Part 2 balance - helpers, land, workshop (from Muse, Nov 21 2026)

Muse's own copy of this section is the source of truth; this is what the code uses.

- Helpers cost 3x the first draft: Apprentice $450, Lumberjack $1,500, Veteran $6,000, Tree Feller $30,000, Master $150,000, Elite Crew $750,000. No helper wages yet.
- Land asking prices 3x: Small Clearing $3,000, Pine Grove $15,000, Hillside $60,000, River Valley $225,000, Redwood $750,000, Mountain $3,000,000. Seller secret minimums scale the same.
- Workshop: Backyard Shed stays $600 but is locked until the first land ("Buy your first land to unlock the workshop"). Others 2x: Trailer $5,000, Small Workshop $20,000, Lumber Shop $80,000, Warehouse $300,000, Factory $1,000,000, Timber Plant $3,000,000, Global Hub $10,000,000.
- Coder choices (BALANCE, change freely): each extra copy of a helper costs 15% more; level-ups cost hire price x 1.6 per level; Backyard Shed takes 60 minutes to build (Gold can finish it); land upgrades cost 25% / 40% / 60% of asking for +20% / +30% / +50%.
- Not built yet: AI rival companies, timed land auctions, the manager helper, tools, wood quality, storage limits.

## 17. Part 3 - make money and keep players (from Muse, Nov 21 2026)

Sell time, not power. About 5% of players pay, so the game must be fully fun for free. No hard paywall, no pay-to-win, clear prices.

1. Rewarded video ads, opt-in only. Never forced, never while tapping, never forced on payers. Welcome Back screen: watch for 2x offline earnings or a plain Collect button. 2x production for 30 minutes per video (watching again adds 30 min, up to 4 hours). Free Gold from videos capped at 5 a day (5 Gold each). Boosts add, never multiply (2x + 2x = 3x). VIP and Remove Ads players get video rewards instantly with no video.
2. VIP: $4.99 per month, $39.99 per year. 2x earnings, 100 Gold a day, exclusive cosmetics, no ads.
3. Retention: 7-day daily rewards with a big Day 7; missing a day pauses the streak, never resets it. 3 daily quests and 1 weekly quest. Weekly Timber Rush (Friday to Sunday): 2x output on one wood type you own. Prestige (Timber Baron) at $200,000,000 earned in one run, about 2.8 days of normal play (4 x 30 min sessions a day); run 2 is about 2x to 3.7x faster depending on when you take it (speed = 1 + square root of run earnings / $200M).
4. Push notifications: ask after the first upgrade, not on first launch. Max 1 a day, quiet hours 9pm to 9am, personal ("Your helpers stacked up 12,400 logs").
5. Offline earnings: helpers and land at 50% rate, 8 hour cap.
6. Gold shop (sells time): 2x Wood 1 hour 20 Gold, 2x Wood 24 hours 150 Gold, 2x Money 1 hour 20 Gold, instant axe repair 10 Gold, finish workshop builds and crafts at 1 Gold per 3 minutes left.
