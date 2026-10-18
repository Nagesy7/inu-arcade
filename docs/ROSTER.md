# Inu Arcade Roster

> **RULE:** Every Inu Arcade game is an original Inu twist, never a straight remake. No original game names, characters, moves, sprites, art, music, sound effects or level layouts. A classic game may only be referenced internally as loose genre inspiration; player-facing names, art and design are 100% original Inu.

## Live cabinets

Each has Classic and Inu Mode, v2 remixed rules, and an optional joystick toggle (in progress).

### Kibble Chomp

- **Player-facing name:** Kibble Chomp
- **Twist:** A Shiba clears a green-hedge maze of kibble while a cat gang with four distinct personalities hunts; power bones flip the chase, Inu Mode adds bark-stun and $KIBBLE coin pickups.
- **Genre inspiration (internal only):** classic maze-chase cabinets (e.g. Pac-Man). Never use those names, characters, sprites, sounds or layouts player-facing.

### Bark Invaders

- **Player-facing name:** Bark Invaders
- **Twist:** Bark a descending rug-pull arrowhead fleet out of the sky before it reaches your kennel; Inu Mode adds Mega Woof (piercing hold-release blast) and a rug-pull whale boss every 3rd wave.
- **Genre inspiration (internal only):** classic fixed-shooter cabinets (e.g. Space Invaders). Never use those names, characters, sprites, sounds or layouts player-facing.

### Pup Crossing

- **Player-facing name:** Pup Crossing
- **Twist:** Hop a pup across Kibble Highway and Bonewater Creek into the kennels; Inu-flavoured traffic, logs and biscuit bonuses.
- **Genre inspiration (internal only):** classic lane-crossing cabinets (e.g. Frogger). Never use those names, characters, sprites, sounds or layouts player-facing.

### Bone Breaker

- **Player-facing name:** Bone Breaker
- **Twist:** Bat a tennis ball into a crate wall and catch bone-shaped treats for power-ups; Inu Mode remixes paddle and pickup rules.
- **Genre inspiration (internal only):** classic brick-breaker cabinets (e.g. Breakout / Arkanoid). Never use those names, characters, sprites, sounds or layouts player-facing.

### Street Sniffer *(working name — pending Zachary's approval)*

- **Status:** LIVE at `/street-sniffer` (Oct 18). Name lives in one constant (`NAME` in `src/games/street.js`) for an easy rename.
- **Player-facing name (pending):** Street Sniffer
- **Twist:** A Shiba sniffs kibble through an original city-block map while the cat gang (Kibble Chomp's shared personality module) hunts. Plays differently: avenues of traffic that dog and cats both dodge, one-way alleys both must obey, bins to hide in (cats lose track), and power-ups that never make cats edible (squeaky-toy lure, fire-hydrant splash, delivery-scooter dash). Inu Mode pockets power-ups (A) and adds $KIBBLE coins.
- **Genre inspiration (internal only):** urban maze-chase / street-run genre. No source-game names, characters, sprites, sounds or layouts.
- **Kibble Pay:** registered (`street-sniffer`, max 50,000, Inu Score v3, kibble-pay 3c19839).

### Paw-Fu Tower *(working name — pending Zachary's approval)*

- **Status:** LIVE at `/paw-fu-tower` (Oct 18). Name lives in one constant (`NAME` in `src/games/pawfu.js`) for an easy rename.
- **Player-facing name (pending):** Paw-Fu Tower
- **Twist:** A Shiba martial artist (white gi, red headband) climbs four original five-floor tower stages: ladders, ledge steps and drop gaps, with each floor's way up roped off until its KO quota is met. Original Inu moves only: Paw Jab, Hind Kick, Low Paw, Low Sweep, Sky Wag (Inu Mode: Zen Bark). Enemies: alley cats (wind-up, then pounce), rug bots (roll, rev, charge; low, so sweep them), pigeons (coo, then dive; crouch), ninja rats (wall cling, hop, glint, dash). Roof bosses: Major Whiskers, Ruglord Rollo, Duchess Coocoo, Shogun Squeaks. Two buttons (A/B), 8-way stick.
- **Genre inspiration (internal only):** climbing martial-arts platformers as loose genre only. No source-game names, characters, moves, sprites, sounds or layouts.
- **Kibble Pay:** registered (`paw-fu-tower`, max 100,000, 400/s, min 5 s, version 2; arcade-run quest; Inu Score v4, 11 games, max 15,000; kibble-pay da71c8c).

### Bone Digger *(working name — pending Zachary's approval)*

- **Status:** LIVE at `/bone-digger` (Oct 18). Name lives in one constant (`NAME` in `src/games/digger.js`) for an easy rename.
- **Player-facing name (pending):** Bone Digger
- **Twist:** A Shiba digs down from the backyard lawn through four soil layers (loam, clay, shale, crystal; deeper is slower and pays more) for buried bones. Pests: moles that tunnel through dirt, snakes that only slither along tunnels and hiss before a straight strike, beetles that shimmer then phase through soil. Original attack: the Bark Pump, a sound wave down the tunnel that fluffs a pest up with static until it pops (no hose, harpoon or inflating look). Boulders wobble then drop (crush bonuses), golden bones, a treat, yard timer then HURRY. Inu Mode: Bone Boomerang plus $KIBBLE coins.
- **Genre inspiration (internal only):** digging / tunnel cabinets as loose genre only. No source-game names, characters, sprites, sounds or layouts.
- **Kibble Pay:** registered (`bone-digger`, max 180,000 = ~10× best human-sim run 18,062, 400/s, min 5 s, version 2; arcade-run quest; Inu Score v5, 12 games, max 16,000; kibble-pay c077ae5).

### Pip's Big Bark (approved name)

- **Status:** LIVE at `/pips-big-bark` (Oct 18). Name lives in one constant (`NAME` in `src/games/pip.js`).
- **Built to the spec below:** all 6 stages, every listed mechanic, the five named bosses plus one mini-boss. Boss mapping: 1 Plaza Rooftops → Sir Whiskerton on his rocket scooter; 2 Hanami Park → PETAL-VAC 3000 (rug-bot street sweeper, mini-boss); 3 Biscuit Beach → Tide Croc; 4 Pawprint Shrine Isle → Lantern Fox; 5 Kibble Mines → Mine Mole; 6 Syndicate Tower → Grey Cat Boss in the giant claw machine. Three buttons (A jump/wag/glide, B bark, C Bone-erang), 8-way stick. `$KIBBLE` buys cosmetics only (scarf colours via the cabinet's neon/gold skins).
- **Genre inspiration (internal only):** kid-hero side-scrolling platformers as loose genre only. No source-game names, characters, moves, sprites, sounds or layouts.
- **Kibble Pay:** registered (`pips-big-bark`, max 380,000 = ~10× best human-sim run 37,740, 400/s, min 5 s, version 2; arcade-run quest; Inu Score v6, 13 games, max 17,000; kibble-pay 2241351).

## Build order

1. Joystick toggle (in progress)
2. Street Sniffer (LIVE, working name pending approval)
3. Paw-Fu Tower (LIVE, working name pending approval)
4. Bone Digger (LIVE, working name pending approval)
5. Pip's Big Bark (LIVE)

Mask Pup and the Inu fighter are logged only for now, not scheduled.

## Queued cabinets (all original)

### 1. Street Sniffer *(working name — pending Zachary's approval)* — ✅ LIVE (see Live cabinets)

- **Player-facing name (pending):** Street Sniffer
- **Twist:** A dog runs through maze-like city streets eating kibble and dodging cats. Keeps Kibble Chomp's cat personality system but must play clearly differently: street blocks, alleys, traffic/one-way lanes, bins to hide behind, new power-ups.
- **Genre inspiration (internal only):** urban maze-chase / street-run genre. No Pac-Man (or other source-game) names, characters, sprites, sounds or layouts.

### 2. Paw-Fu Tower *(working name — pending Zachary's approval)* — ✅ LIVE (see Live cabinets)

- **Player-facing name (pending):** Paw-Fu Tower
- **Twist:** Inu martial-artist climber/fighter — multi-level platforms with ladders and ledges, kicks and punches, patterned enemy types, a boss per stage, stage timers. Fully original Inu moves and enemy designs.
- **Genre inspiration (internal only):** climbing martial-arts platformers (e.g. Kung-Fu Master / Donkey Kong–style stage structure as loose genre only). No source-game names, characters, moves, sprites, sounds or layouts.

### 3. Bone Digger *(working name — pending Zachary's approval)* — ✅ LIVE (see Live cabinets)

- **Player-facing name (pending):** Bone Digger
- **Twist:** Tunnel for buried kibble and bones; burrowing enemies (moles, snakes) handled with an original mechanic (bark-pump or bone throw); falling rocks, depth layers, bonus bones.
- **Genre inspiration (internal only):** digging / tunnel cabinets (e.g. Dig Dug). No Dig Dug, Pooka, Fygar or other source-game names, characters, sprites, sounds or layouts.

### Pip's Big Bark (approved name) — ✅ LIVE (see Live cabinets)

- **Hero:** Pip, a scrappy young Shiba with an oversized red scarf.
- **Story:** the Grey Cat Syndicate and its rug bots scattered Pip's pack across Inu Verse, and Pip brings them home.
- **Mechanics:**
  - **Bark Blast:** tap for a quick yip shot, hold to charge a big bark that stuns a whole row.
  - **Bone-erang:** a thrown bone that curves back, hitting on the way out and collecting pickups on the return.
  - **Sniff Mode:** a brief reveal of hidden bones, secret doors and buried treats.
  - **Zoomies meter:** fills from kibble; triggers a speed burst with wall-bounces.
  - **Tail-wag double jump** and a **scarf glide**.
  - **Pack followers:** each rescued pup trails Pip with a small helper perk (one fetches coins, one barks a warning before traps). Taking a hit sends one follower home.
- **Levels:** 1 Plaza Rooftops (laundry lines, pigeons); 2 Hanami Park (a petal storm hides enemies); 3 Biscuit Beach (rising and falling tide); 4 Pawprint Shrine Isle (lantern climb); 5 Kibble Mines (minecart rides); 6 Syndicate Tower (vertical climb).
- **Bosses:** Sir Whiskerton on a scooter, the Tide Croc, the Lantern Fox, the Mine Mole, the Grey Cat Boss in a giant claw machine.
- **Rules:** original chiptune music; phone landscape with multi-touch move+jump+shoot; the joystick toggle; everything earned in play; `$KIBBLE` buys cosmetic scarves and colours only, with no gameplay effect; server-side Inu Score and prize boards; free entry; skill prizes only.
- **Genre inspiration (internal only):** kid-hero side-scrolling platformers. Not a remake.

## Planned (approved, not scheduled)

### Mask Pup

Inspired by hat-swap transformation platformers. A Shiba is trapped in a haunted arcade cabinet in Inu Verse and collects hats that transform him:

- **Samurai Band:** dash through walls and slice
- **Diver Cap:** swim
- **Rocket Beanie:** short jetpack burst
- **Tank Helmet:** crush blocks and absorb hits
- **Ninja Hood:** wall-climb and brief invisibility
- **Pixel Crown:** flip gravity

Grabbing a second hat gives a short fused form (e.g. Samurai + Rocket = flying dash slash). Each level has a hidden hat-only shortcut for speedrunners.

**Worlds:** Neon Plaza rooftops, Hanami Park blossom storm, Biscuit Beach rising-tide caves, Pawprint Shrine Isle lantern platforms, the Glitch Cabinet.

**Enemies:** Rug Rats, Pump Bots, Alley Cats (they copy your last move).

**Bosses:** Fog Badger, Tide Croc, Lantern Fox, Iron Tomcat, Glitch King (steals your hat).

**Music:** original chiptune/lo-fi; each hat swaps the lead instrument.

Hats are earned in levels, never bought; $KIBBLE only buys cosmetic colours.

- **Genre inspiration (internal only):** hat-swap transformation platformers (e.g. Kid Chameleon). No Sega, Kid Chameleon or other source-game names, characters, sprites, sounds or layouts.

### Inu fighting game

Fully original Inu arcade fighter — no Capcom or Street Fighter names, characters, moves or art. The Inu twist is TBD.

> **OPEN QUESTION for Zachary:** make it clearly different from Meme Brawl, or build it as a Meme Brawl arcade mode?

- **Genre inspiration (internal only):** classic arcade fighters. Never use Street Fighter, Capcom or other source-game names, characters, moves, sprites, sounds or layouts player-facing.

## Rules for all cabinets

- Follow the standing RULE at the top of this file. No trademarked names, sprites, sounds or level layouts; original Inu art (Inu Verse style); follow `/workspace/inu-shared/ip-renames.md`.
- Phone landscape with the joystick toggle; no stacked sounds; jitter-free movement; Back to Inu Verse button; Connect Wallet; each cabinet has its own link and share card.
- Scores go server-side to the Inu Score (kibble-pay `/api/inu-score`, contract `/workspace/inu-shared/inu-score.md`) and the Kibble Pay prize boards (v:2). `TEST_WALLETS` respected.
- `$KIBBLE` buys cosmetics only and never changes gameplay; entry is free and prizes are skill only.

## Pending originality fixes (from Oct 18 audit)

- **DONE (Oct 18):** internal maze-chase source-game identifiers and strings renamed to Inu terms: `chomp.js` player state/sprites are now `pup` / `pupSpeed` / `pupPixel` / `movePup` / `SPR_PUP` / `PUP_PAL`, the cat wall helper is `catWall`, the cat-eaten sound is `eatCat` (`chomp.js` + `audio.js`); tests, `README.md` (retired v1 rules section removed) and `scripts/e2e.mjs` cleaned. The ghost-replay feature is unchanged.
- **DONE (Oct 18):** fixed-shooter identifiers renamed: `src/games/invaders.js` is now `src/games/bark.js` (import alias `Bark` / `BK`), `s.aliens` is now `s.fleet`, the three row types are `drone` / `rug` / `bear`, and the bonus ship is `balloon` (`BALLOON_FRAMES`). The public route `/bark-invaders`, game id `bark-invaders`, achievement ids and all storage keys are unchanged.
- **Guard:** `tests/originality.test.mjs` fails if any of these identifiers come back in source, tests, README or e2e.
- **OPEN QUESTION for Zachary:** should the player-facing title **Bark Invaders** be renamed? It shares the word "Invaders" with a classic fixed-shooter title. (Not renamed; still pending.)
