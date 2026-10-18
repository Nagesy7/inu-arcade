# Inu Arcade

Live: https://inu-arcade.vercel.app · Repo: https://github.com/Nagesy7/inu-arcade

A standalone pixel arcade hall of **original** Inu-themed remixes of classic arcade mechanics. Vanilla JS + canvas, no framework, no build step.
Only the mechanics are borrowed. All names, characters and art are original and drawn in code (`src/core/pix.js`).

| Path | Cabinet | Mechanic |
|---|---|---|
| `/kibble-chomp` | Kibble Chomp | maze chase: kibble 10, power bone 40, scared cats 250/500/750/1000 (they flee), bonus treats at 60/150 kibble, 4 cat personalities (Tracker/Guard/Flanker/Moody) |
| `/bark-invaders` | Bark Invaders | fixed shooter: 43-dog arrowhead fleet (rows 5/7/9/11/11; 40/25/15 pts), pebble (aimed) + zigzag (sweeping) bombs, diving pups, balloon bonus 300→100 |
| `/pup-crossing` | Pup Crossing | lane hopper: 4 dog-park gates, 50 s timer, bins/scooters/mowers/vans/buses then flipping frisbees, pool noodles and a raft, lawn sprinklers, biscuit +250, toy +150 |
| `/bone-breaker` | Bone Breaker | paddle + ball: 12×7 crate wall, 3 screen maps, tough 2-hit crates, rally speed-ups, paddle wears down every 20 hits |
| `/street-sniffer` | Street Sniffer *(working name)* | city-street chase: original city-block map with alleys, two avenues of one-way traffic (dog and cats both dodge it), one-way alleys, bins to hide in (cats lose track), hydrant splash, squeaky-toy lure, delivery-scooter dash; cats are never edible |
| `/paw-fu-tower` | Paw-Fu Tower *(working name)* | climb-and-fight: a Shiba martial artist climbs 4 original five-floor tower stages (ladders, ledge steps, drop gaps); each floor opens only after a KO quota; alley cats pounce, rug bots roll and charge (low: sweep them), pigeons dive (crouch), ninja rats wall-hop and dash; a named boss on every roof; stage timer; two buttons (A Paw Jab, B Hind Kick, DOWN+B Low Sweep, B in the air Sky Wag) |
| `/bone-digger` | Bone Digger *(working name)* | digging: carve tunnels down through 4 soil layers (loam, clay, shale, crystal; deeper = slower to dig, pests worth more) to collect every buried bone; moles tunnel through dirt, snakes slither only along tunnels and hiss before a straight-line strike, beetles shimmer then phase through soil; Bark Pump (A) sends a sound wave down the tunnel that fluffs a pest up with static until it pops; dig under a boulder and it wobbles then drops (crush bonus); golden bones, a treat after 2 boulders; yard timer then HURRY |
| `/pips-big-bark` | Pip's Big Bark | side-scrolling platformer: Pip (a young Shiba with an oversized red scarf) brings the pack home across 6 original stages (Plaza Rooftops, Hanami Park petal storm, Biscuit Beach tide, Pawprint Shrine Isle lantern climb, Kibble Mines minecarts, Syndicate Tower vertical climb) vs the Grey Cat Syndicate and its rug bots; Bark Blast (tap yip / hold Big Bark row-stun), Bone-erang (curves back, collects pickups on the return), Sniff Mode (hidden bones, secret doors, buried treats), Zoomies meter (speed burst with wall-bounces), tail-wag double jump, scarf glide, pack followers with perks (a hit sends one home); bosses Sir Whiskerton (scooter), PETAL-VAC 3000 (mini-boss), Tide Croc, Lantern Fox, Mine Mole, Grey Cat Boss (claw machine); stage timer, original chiptune; 3 buttons (A jump, B bark, C Bone-erang), 8-way stick |
| `/shiba-scuffle` | Shiba Scuffle *(working name)* | top-down 3v3 team brawler vs bot packs: pick BRUNO (Bruiser), KIKO (Barker), DANGO (Snacker) or ZIP (Zoomer); tug the Big Bone into your kennel (more Shibas at the bone = it slides your way), first to 2 rounds wins the match; 3 mirrored arenas with hazards (Sakura Yard sprinklers, Rooftop Plaza rug bot, Boardwalk surges), crates, treats, bushes to hide in; ranks PUPPY→LEGEND as the bots sharpen. Desktop co-op: P2 joins with `,` (arrows + `, . /`), unranked |
| hall cabinet | Inu Rescue | links to https://inu-rescue.vercel.app (the first cabinet) |

Every cabinet has a title screen, attract mode (bot demo), play, pause (START), game over, 3-letter initials entry, a results card, its own URL and its own share card (`og/*.png`, per-game `og:`/`twitter:` tags in `/<game>/index.html`) plus a share-to-X button carrying the score.

## Modes & modern layer
Each cabinet's title screen has a mode select (◀ ▶ / tap). **Every mode has its own leaderboards** (`<game>`, `<game>@inu`, `<game>@daily`).
- **CLASSIC:** the pure arcade rules and difficulty, with no twists and no modifier.
- **INU MODE:** the classic core plus a signature move and twists, with this week's modifier on top:
  - Kibble Chomp: **Bark Stun** (A; freezes cats within 3.5 tiles for 2 s, 8 s cooldown), plus **$KIBBLE coins** (+500) twice per maze. The enemies are bear-market cats.
  - Bark Invaders: **Mega Woof** (hold A for 0.9 s, release for a piercing beam, 6 s cooldown), **rug-pull whale boss** on every 3rd wave (+2000), and streak bonuses.
  - Pup Crossing: **Zoomies Leap** (A; 2 rows, 5 s cooldown), plus **lost puppies** riding the logs. Carry one to a kennel for +300.
  - Bone Breaker: **Bone Smash** (A; a bone shot, 6 s cooldown), bone power-ups (**Fetch** catch, **Bone Storm** pierce, Big Bone, Pup Pack), and a moving **FUD-bot boss brick** each level (+500).
  - Street Sniffer: **Pocket** (A; power-ups are pocketed and used when you choose) plus **$KIBBLE coins** (+500) twice per city.
  - Paw-Fu Tower: **Zen Bark** (hold A for 0.6 s and release: stuns foes within 44 px for 2.2 s, 6 s cooldown) plus **$KIBBLE coins** (+500) after every 6th KO.
  - Bone Digger: **Bone Boomerang** (hold A for 0.5 s and release: a bone flies down the tunnel and back, stunning every pest it passes, 6 s cooldown) plus **$KIBBLE coins** (+500) buried twice per yard.
  - Pip's Big Bark: **Pack Howl** (with 2+ pups following, a full Big Bark becomes a howl that stuns everything on screen, 8 s cooldown) plus **$KIBBLE coins** (+500) hidden in every stage.
- **DAILY CHALLENGE:** Inu Mode on a seed shared by everyone for the day (`dailySeed`). It has its own board.
- **Weekly modifiers** rotate every Monday (Zoomies, Glass Pup, Iron Coat, Diamond Paws). Each changes speed and/or lives, with a score multiplier, and applies the same to everyone in Inu and Daily modes.
- **Achievements** (22, 🏅 button) pay a fixed number of tickets, once each.
- **Ghost replays:** every run records its inputs (RLE, deterministic fixed-step sim). Your best run per board races you as a translucent "BEST" ghost and plays back in attract mode.
- **Presentation:** CRT scanlines + bloom (📺 toggle, on by default), particles, screen shake, combo/score pop-ups, and a dynamic chiptune loop that adds layers and tempo with level, danger and Inu Mode.

## Controls
Desktop: arrows/WASD move, Space/Z/J = A, X/K/C = B (two-button cabinets; elsewhere it acts as A), Enter = START, Esc = back to the hall. Click a cabinet to walk to it and play.
Phone (landscape): on-screen D-pad, A (plus a blue B in two-button cabinets like Paw-Fu Tower), START and BACK, with multi-touch and finger-sliding between buttons. Tap a cabinet in the hall to play.
Optional **joystick** (⚙ Settings → Joystick controls, OFF by default): a semi-transparent left-thumb stick with a dead zone replaces the D-pad (4-way in Kibble Chomp / Pup Crossing / Street Sniffer / Bone Digger, 8-way in Paw-Fu Tower / Pip's Big Bark, left/right in Bark Invaders / Bone Breaker, 4-way in menus, 8-way in the hall). A/START/BACK stay on the right and work together with the stick. One setting for every cabinet (`src/core/joystick.js`, key `inuarcade.settings.v1`, also in the wallet cloud save). `node scripts/joystick-check.mjs` checks it never covers the playfield at 667x375 / 750x342 and runs the toggle test; `JOY=1 node scripts/phone-playtest.mjs` plays with it on.

## Scores, prizes, rewards
- Per-game boards and a combined **Arcade** board (each game's top score in the period = 1000 pts, others get a share). Daily, weekly (from Monday), monthly and all-time.
- Prize pools (daily 600, weekly 3000, monthly 12000 Bones plus a cosmetic) go to the **top 3 by rank only**. Free entry, no paid play, no draws or chance. House demo scores (INU/PUP/DOG) are never eligible.
- Each play earns Bones (capped at 600 a day; never cashed out) and prize tickets (1 + 1 per score tier).
- Prize counter: fixed ticket prices for cosmetics (hat, shades, scarf, jacket, pin, sneakers, lobby trail). No randomness. Bought items equip on your Shiba.
- Cabinet skins: Neon (12 tickets) and Gold (burn 250,000 real $KIBBLE via Phantom; simulated only with `?demo=1`). Each cabinet also has a sponsor slot (`SPONSORS` in `src/core/rewards.js`).
- Local boards (initials, ghosts, Bones/ticket pools) stay in localStorage. **Wallet-signed scores**: after `Sign in with Phantom` (🐕 Me), every run posts to kibble-pay `/api/game?action=score` (sanity caps + rate limits), and the 🏆 panel shows the real $KIBBLE prize board and pool from kibble-pay. `api/scores.js` is the old unauthenticated stub, kept only for the Inu Verse hi-score sign.

## Wallet & profile
- `src/core/wallet.js`: real kibble-pay SDK adapter by default (loaded via `https://kibble-pay.vercel.app/inu-games.js`). $KIBBLE is live (CA `4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump`): Gold-skin burns are real, signed in Phantom. Burns are optional, recorded server-side as `burn:inu-arcade:skin:<game>:gold` and restored from `/api/inventory` on sign-in. The fake `simWallet` runs **only with `?demo=1`** (separate save slot, labelled DEMO). The footer links Terms / Prize Rules.
- The player's Shiba is drawn with the vendored `src/vendor/inu-avatar.js` + `profile-schema.js` (copied from kibble-pay; re-sync with `cp ../kibble-pay/public/inu-avatar.js ../kibble-pay/public/lib/profile-schema.js src/vendor/`). "🐕 Me" can load a public profile from `https://kibble-pay.vercel.app/api/profile?wallet=…`.

## Embedding in Inu Verse (later, done separately)
The arcade building in Inu Verse can simply **link** out (recommended, best for touch):
```js
window.open('https://inu-arcade.vercel.app/', '_blank');            // the hall
window.open('https://inu-arcade.vercel.app/kibble-chomp', '_blank'); // straight into a cabinet
```
or **embed** it in an iframe panel:
```html
<iframe src="https://inu-arcade.vercel.app/bone-breaker" allow="autoplay; fullscreen" style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```
Inside an iframe, keyboard needs a click into the frame first. Scores and tickets live in the arcade origin's localStorage until the server API is authoritative. Valid cabinet ids are `kibble-chomp`, `bark-invaders`, `pup-crossing`, `bone-breaker`, `street-sniffer`, `paw-fu-tower`, `bone-digger`, `pips-big-bark` and `shiba-scuffle`; `#/kibble-chomp` hashes also work.

**Inu Verse district contract (v2, `/workspace/inu-shared/verse-districts.md`)**, handled by `src/core/verse.js` for every cabinet:
- Entry: `?from=verse` (district/cabinet doors) or `?from=inu-verse` (hall) plus `district=<id>`, `spawn=<id>` and `return=<url>`. Cabinets with `META.verse` supply their default district/spawn (Shiba Scuffle: `arena` / `door-shiba-scuffle`); others default to `arcade-row` / `door-<cabinet-id>`.
- 🏠 Back to Inu Verse goes to `return=` only when it is `https://inu-verse-tawny.vercel.app` or this Arcade's own origin (no open redirects; other values fall back to the Verse door from `spawn`/`district`, else the Verse root).
- When framed, the Arcade posts to the Verse origin only: `inu-arcade:ready {cabinetId, embed: true}` on load, `inu-arcade:exit {cabinetId, reason: 'home', url}` on 🏠 (plus the legacy `inu:back-to-verse`), and `inu-arcade:score {cabinetId, score, mode, durationMs}` at game over (UX-only toast, never prize truth).

## Dev
```
npm test                 # node logic tests (games + leaderboards + rewards)
npm run serve            # http://localhost:8140
node scripts/e2e.mjs     # Playwright: desktop keyboard + iPhone 13 landscape touch, screenshots to proof/
URL=https://inu-arcade.vercel.app TAG=live node scripts/e2e.mjs
node scripts/perf-check.mjs shiba-scuffle   # frame cost at 4x CPU throttle, phone landscape (p95 budget 8 ms)
node scripts/build-pages.mjs && node scripts/og.mjs   # regenerate per-game pages + share cards after editing index.html
export PATH=$HOME/.local/bin:$PATH; vercel deploy --prod --yes
```

## Remixed rules (v2 rules, current)
Every cabinet is an original Inu design. **Classic** = classic-difficulty rules on these original layouts and tables; **Inu Mode** layers its twists on top. Tables are exported from each module and asserted in `tests/rules.test.mjs`.
- **Kibble Chomp**: kibble 10, power bone 40, scared-cat chain 250/500/750/1000, extra life at 8,000. Cats: Tracker (chases you), Guard (cuts you off ahead), Flanker (mirrors Tracker), Moody (swaps mood every 3 s). Scared cats run away for `max(1.5, 8 − 0.6·(level−1))` s. Bonus treats (150→2000) appear at 60 and 150 kibble. The house releases cats on a timer (level 1: 0, 4, 8, 12 s) or after 12 kibble, and 0.6× faster after you lose a life. Dinner-bell rush only from level 2.
- **Bark Invaders**: 43 dogs in an arrowhead (5/7/9/11/11; 40/25/15). The fleet steps faster as it thins and starts lower each wave (128 + 12·((wave−1) mod 6)). Two bomb types: pebble (aimed) and zigzag (sweeping). Divers peel off (+2 each). Balloon bonus is worth 300 to 100 (earlier = more). Extra life at 2,000. Wave 1 is gentler: slower volley and divers start later.
- **Pup Crossing**: 4 dog-park gates, 50 s timer, 10 per step, 60 + 10/s per gate, +800 for all four, biscuit +250, toy +150 (Inu Mode: lost puppy +300), extra life at 15,000. Shut gates and fences kill; sprinklers splash. Level 1 is forgiving: lanes at 0.75× speed, no flipping frisbees, shorter and smaller sprinkler bursts, 3 px edge grace on floaters. Flips start at level 2 (second flipper at 3) and lanes speed up 10% per level from level 2 (cap 1.7×).
- **Bone Breaker**: 12×7 crates across 3 screen maps, rows worth 6/5/4/3/2/2/1, tough 2-hit crates, ball speed ladder 1.6→3.2 every 10 rally hits and on reaching the deep rows, paddle 24 px that wears 2 px every 20 hits (minimum 16), max angle 62°. Classic max is about 714.
- **Street Sniffer** (working name; rename via `NAME` in `src/games/street.js`): 32×27 original city map. Kibble 10, power-up 50, hydrant soak 200, car honks a cat home 100, scooter bump 50, avenue crossing 25, city clear 300 + 150/level (max 1500), extra life at 10,000. Avenues (rows 9 east, 17 west) carry `min(4, 2 + ⌊(L−1)/2⌋)` cars at `0.5 + 0.09·(L−1)` px/frame (+20% rush hour when ≤25% kibble is left); headlights blink at the curb before a car enters. One-way alleys block both dog and cats. Bins hide you for `max(2.5, 4.5 − 0.25·(L−1))` s (12 s cooldown); hydrants spray 6 tiles for 1.5 s (20 s cooldown); toy lure `max(3, 7 − 0.5·(L−1))` s; scooter dash `max(2.5, 4.5 − 0.25·(L−1))` s at 1.45× speed, car-immune. Cats patrol/hunt on their own clock (first patrol 7 s, shrinking per level) and share Kibble Chomp's personality module (`src/core/cats.js`). Level 1–2 forgive a car scrape. Tables are asserted in `tests/street.test.mjs`.
- **Paw-Fu Tower** (working name; rename via `NAME` in `src/games/pawfu.js`): 4 original stages (Lantern Gate, Laundry Lofts, Pigeon Spire, Shadow Pagoda), five floors each. Hit 10, KO cat 100 / rug bot 150 / pigeon 120 / ninja rat 200, new floor 50, combo +10 per chained hit, boss 1500 + 500·stage, time bonus 10/s, extra life at 20,000. HP 10 (+1 when a floor opens, full after a boss). Floor KO quota 2 (L1), rising to 5. Stage timer 160 s − 8 s/level (min 90), at least 60 s for the boss; a KO respawns you on your highest floor with +30 s. Bosses: Major Whiskers (stalk, pounce hops, hairball, nap), Ruglord Rollo (rev, charge, dizzy, shockwave slam, mini rugs), Duchess Coocoo (hover, swoop, feather fan, perch) and Shogun Squeaks (wall-hop, glint, low slash, stars, tired). Speeds, wind-ups and spawn rates are exported tables (`speeds`, `windups`, `spawnEvery`, `maxEnemies`, `stageSecs`, `bossHp`). After stage 4 the tower loops faster.
- **Bone Digger** (working name; rename via `NAME` in `src/games/digger.js`): 4 original yards (Backyard, Veggie Patch, Old Orchard, Fossil Beds), 16×13 cells of 16 px carved at 2 px resolution. Dig 2 per new cell, kibble 10, bone 100, golden bone 1000 (every 35 s, 12 s), treat 400→3000 by yard (after the 2nd boulder), pop 200/300/400/500 by layer, boulder crush 500/1000/2000/4000/6000/8000, time bonus 10/s, extra life at 20,000. Pump: 3 hits pop a pest in yards 1–2, 4 from yard 3; each hit's fluff wears off after 1.25 s. Dig speed 0.85/0.75/0.65/0.55 of the tunnel speed by layer. Yard timer 110 s − 5 s/yard (min 60); at 0 it's HURRY (pests ×1.35 and an extra mole every 15 s). Pests wait 2–4 s in their dens at the start. Tables are exported (`speeds`, `windups`, `levelSecs`, `enemyCount`, `burrowEvery`, `PUMP`, `BOOM`, `PTS`).
- **Pip's Big Bark** (approved name; `NAME` in `src/games/pip.js`, art in `src/games/pip-art.js`): 6 original stages, then the run loops harder (faster foes, shorter tells, +3 boss HP per lap). Kibble 10, rescue 500 (+1000 pack bonus per pup still following at stage clear), bone 300, treat 1000, secret door 250, checkpoint 200, KO 100–200 by foe, stomp chain 50×n, boss 3000 + 1000·stage (mini-boss 1500), time bonus 10/s, extra life at 30,000. Pups: MOMO (fetches kibble and coins), KUMO (barks before traps), TARO (longer, wider sniffs). Controls: A (Space/Z) jump, again in the air = tail-wag, hold = scarf glide; B (X/K) yip, hold + release = Big Bark; C (V/L) Bone-erang; hold DOWN = Sniff; UP when the meter is full = Zoomies. Phone: A/B/C on the right, joystick or D-pad on the left, all multi-touch. Cosmetics: the cabinet's neon (tickets) and gold ($KIBBLE burn) skins recolour Pip's scarf only.
- **Shiba Scuffle** (working name; rename via `NAME` in `src/games/shiba.js`, art in `src/games/shiba-art.js`): free entry, skill and rank only. Damage 1/pt, KO 150, assist 50, bone pulled 1/px, crate 20, treat 50, round win 1000×rank (+10/s left when the bone gets home early), match win 2500×rank (+1000 flawless), rank multiplier capped at LEGEND (6). 3 lives; a lost round costs one, a won match gives one back (max 5); a lost match is a rematch at the same rank. Controls: move + A (Space/Z, auto-aims) attack, B (X/K) super when the meter is full, C (V/L) dodge roll. Roles: Shoulder Shove / Belly Flop, Yap Volley / Echo Howl, Treat Lob (heals packmates) / Picnic Blanket, Nip Dash / Tail Tornado. Inu Mode: Pack Rally (a landed super heals nearby packmates 25 and gives them 30 super) and $KIBBLE coins (+500) from crates and the half-way bell. Desktop 2P co-op (P2: arrows + `, . /`; P1 keeps WASD) is unranked: no initials, ghost, tickets or prize submit. Two thumbs and six buttons do not fit phone landscape, so phones get 3v3 with bots. Cosmetics: neon/gold skins recolour your bandana only.
- **Leaderboards**: local boards and ghosts use `inuarcade.scores.v2` / `inuarcade.ghost.v2.*`, so pre-remix scores never mix. House scores (INU/PUP/DOG) were rescaled for v2 from the human-sim medians.
- **Prize scores**: posted to kibble-pay as `{game, score, durationMs, v: 2}` (`kp.submitScore(game, score, ms, { v: 2 })`) with the same game ids (`kibble-chomp`, `bark-invaders`, `pup-crossing`, `bone-breaker`, `street-sniffer`, `paw-fu-tower`, `bone-digger`, `pips-big-bark`, `shiba-scuffle`). `street-sniffer` needs a kibble-pay `scoreGames` entry before its prize scores are accepted.
- **Difficulty tuning**: `node scripts/human-sim.mjs 16` replays each cabinet with a human-like bot (about 250 ms reaction, held decisions, 6% wrong inputs, 4% dropped inputs, occasional zone-outs) and prints the median survival time per cabinet.

The pre-remix rule set (v1) is retired; its scores live under the old v1 storage keys and are never mixed with v2.
