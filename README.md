# Inu Arcade

Live: https://inu-arcade.vercel.app · Repo: https://github.com/Nagesy7/inu-arcade

A standalone pixel arcade hall of **original** Inu-themed remixes of classic arcade mechanics. Vanilla JS + canvas, no framework, no build step.
Only the mechanics are borrowed. All names, characters and art are original and drawn in code (`src/core/pix.js`).

| Path | Cabinet | Mechanic |
|---|---|---|
| `/kibble-chomp` | Kibble Chomp | maze chase: kibble 10, power bone 50, scared cats 200/400/800/1600, maze clear +500, faster cats each level |
| `/bark-invaders` | Bark Invaders | fixed shooter: 9×4 rug-pull fleet (10/20/30), erodible kennel shields, whale bonus ship, fleet speeds up as it thins |
| `/pup-crossing` | Pup Crossing | lane hopper: 5 road lanes, 4 river lanes (logs + duck rafts), 5 kennels, 30 s timer, +1000 and faster lanes when all kennels are full |
| `/bone-breaker` | Bone Breaker | paddle + ball: 13×6 crate wall, angle by hit position, power-ups (wide, multi-ball, slow-mo, extra life), 3 rotating layouts, 2-hit crates from level 3 |
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
- **DAILY CHALLENGE:** Inu Mode on a seed shared by everyone for the day (`dailySeed`). It has its own board.
- **Weekly modifiers** rotate every Monday (Zoomies, Glass Pup, Iron Coat, Diamond Paws). Each changes speed and/or lives, with a score multiplier, and applies the same to everyone in Inu and Daily modes.
- **Achievements** (13, 🏅 button) pay a fixed number of tickets, once each.
- **Ghost replays:** every run records its inputs (RLE, deterministic fixed-step sim). Your best run per board races you as a translucent "BEST" ghost and plays back in attract mode.
- **Presentation:** CRT scanlines + bloom (📺 toggle, on by default), particles, screen shake, combo/score pop-ups, and a dynamic chiptune loop that adds layers and tempo with level, danger and Inu Mode.

## Controls
Desktop: arrows/WASD move, Space/Z/J = A, Enter = START, Esc = back to the hall. Click a cabinet to walk to it and play.
Phone (landscape): on-screen D-pad, A, START and BACK, with multi-touch and finger-sliding between buttons. Tap a cabinet in the hall to play.

## Scores, prizes, rewards
- Per-game boards and a combined **Arcade** board (each game's top score in the period = 1000 pts, others get a share). Daily, weekly (from Monday), monthly and all-time.
- Prize pools (daily 600, weekly 3000, monthly 12000 Bones plus a cosmetic) go to the **top 3 by rank only**. Free entry, no paid play, no draws or chance. House demo scores (INU/PUP/DOG) are never eligible.
- Each play earns Bones (capped at 600 a day; never cashed out) and prize tickets (1 + 1 per score tier).
- Prize counter: fixed ticket prices for cosmetics (hat, shades, scarf, jacket, pin, sneakers, lobby trail). No randomness. Bought items equip on your Shiba.
- Cabinet skins: Neon (12 tickets) and Gold (burn 25 $KIBBLE, **simulated**). Each cabinet also has a sponsor slot (`SPONSORS` in `src/core/rewards.js`).
- Scores are stored in localStorage (`inuarcade.scores.v1`). `api/scores.js` is a kibble-pay-ready stub (GET/POST, in-memory, `authoritative:false`); the client posts to it fire-and-forget.

## Wallet & profile
- `src/core/wallet.js`: `simWallet` (100 demo KIBBLE, no chain) is active. Swap with `setWallet(kibblePayWallet(kibblePay))` once $KIBBLE is minted. Callers don't change. No seed phrases or keys are ever handled.
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
Inside an iframe, keyboard needs a click into the frame first. Scores and tickets live in the arcade origin's localStorage until the server API is authoritative. Valid cabinet ids are `kibble-chomp`, `bark-invaders`, `pup-crossing` and `bone-breaker`; `#/kibble-chomp` hashes also work.

## Dev
```
npm test                 # node logic tests (games + leaderboards + rewards)
npm run serve            # http://localhost:8140
node scripts/e2e.mjs     # Playwright: desktop keyboard + iPhone 13 landscape touch, screenshots to proof/
URL=https://inu-arcade.vercel.app TAG=live node scripts/e2e.mjs
node scripts/build-pages.mjs && node scripts/og.mjs   # regenerate per-game pages + share cards after editing index.html
export PATH=$HOME/.local/bin:$PATH; vercel deploy --prod --yes
```
