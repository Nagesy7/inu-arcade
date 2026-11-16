// Generates per-game entry pages (/kibble-chomp/index.html, ...) with their own og/twitter share-card tags.
import fs from 'node:fs'; import * as Street from '../src/games/street.js'; import * as Pawfu from '../src/games/pawfu.js'; import * as Digger from '../src/games/digger.js'; import * as Pip from '../src/games/pip.js'; import * as Scuffle from '../src/games/shiba.js';
import * as Gust from '../src/games/gust.js'; import * as Dash from '../src/games/dash.js'; import * as Stack from '../src/games/stack.js'; import * as Hue from '../src/games/hue.js'; import * as Beat from '../src/games/beat.js'; import * as Fuse from '../src/games/fuse.js'; import * as Sky from '../src/games/sky.js'; import * as Rift from '../src/games/rift.js'; import * as Coil from '../src/games/coil.js'; import * as Spark from '../src/games/spark.js';
const SITE = process.env.SITE || 'https://inu-arcade.vercel.app';
const html = fs.readFileSync('index.html', 'utf8');
const GAMES = {
  'kibble-chomp': ['Kibble Chomp', 'Eat every kibble, dodge the cat gang, grab a power bone and chase them back. Free-to-play Shiba maze chase at Inu Arcade.'],
  'bark-invaders': ['Bark Invaders', 'Bark the descending rug-pull fleet out of the sky before it reaches your kennel. Free-to-play Shiba shooter at Inu Arcade.'],
  'pup-crossing': ['Pup Crossing', 'Hop a pup across Kibble Highway and Bonewater Creek into the kennels. Free-to-play at Inu Arcade.'],
  'street-sniffer': [Street.NAME, 'Sniff out every kibble on the city streets: dodge avenue traffic, obey the one-way alleys and duck behind bins to lose the cat gang. Free-to-play Shiba street chase at Inu Arcade.'],
  'paw-fu-tower': [Pawfu.NAME, 'Climb a five-floor tower of alley cats, rug bots, pigeons and ninja rats with Paw Jabs, Hind Kicks and Low Sweeps, then beat each floor boss. Free-to-play Shiba kung-fu climber at Inu Arcade.'],
  'bone-digger': [Digger.NAME, 'Dig through loam, clay, shale and crystal for buried bones. Bark-pump moles, snakes and beetles until they pop, and drop boulders on them. Free-to-play Shiba digging game at Inu Arcade.'],
  'pips-big-bark': [Pip.NAME, 'Run, tail-wag double jump and scarf-glide Pip the Shiba across six lands: bark the Grey Cat Syndicate silly, throw the Bone-erang, sniff out secrets, hit the Zoomies and rescue the pack. Free-to-play Shiba platformer at Inu Arcade.'],
  'shiba-scuffle': [Scuffle.NAME, 'Pick a Shiba (Bruiser, Barker, Snacker or Zoomer) and tug the Big Bone home in 3v3 pack brawls against bot packs: yards with sprinklers, rooftops with rug bots and boardwalk surges. Free, skill-and-rank Shiba team brawler at Inu Arcade.'],
  'bone-breaker': ['Bone Breaker', 'Bat the tennis ball into the crate wall and catch treats for power-ups. Free-to-play Shiba brick breaker at Inu Arcade.'],
  'gust-glider': [Gust.NAME, 'Flap a Shiba pup through bone cairns, peaked kennels and timber. Free-to-play at Inu Arcade.'],
  'dash-line': [Dash.NAME, 'Sprint the kennel track, jump the crates and clear the creek gaps. Free-to-play at Inu Arcade.'],
  'stack-shift': [Stack.NAME, 'Drop each bunk on the tower. Overhang is sliced off; a perfect fit keeps it wide. Free-to-play at Inu Arcade.'],
  'hue-flood': [Hue.NAME, 'Spread one colour from the corner until the whole quilt matches. Free-to-play at Inu Arcade.'],
  'beat-lanes': [Beat.NAME, 'Catch notes in four lanes as they cross the line. Free-to-play at Inu Arcade.'],
  'tile-fuse': [Fuse.NAME, 'Slide numbered tiles. Matching numbers fuse into one. Free-to-play at Inu Arcade.'],
  'sky-springs': [Sky.NAME, 'Bounce a pup up wood planks, drifting rafts and spring pads. Free-to-play at Inu Arcade.'],
  'rift-runner': [Rift.NAME, 'Three lanes: switch, hop low fences, duck high bars and take the corner. Free-to-play at Inu Arcade.'],
  'coil': [Coil.NAME, 'Steer a growing Shiba tail, eat the kibble, and don\'t nip yourself. Free-to-play at Inu Arcade.'],
  'spark-factory': [Spark.NAME, 'A two-minute shift: bark the paw and build machines. Free-to-play at Inu Arcade. No wallet, no prizes.'],
};
for (const [id, [t, d]] of Object.entries(GAMES)) {
  const meta = `<title>${t} · Inu Arcade</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Inu Arcade">
<meta property="og:title" content="${t} · Inu Arcade">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${SITE}/og/${id}.png">
<meta property="og:url" content="${SITE}/${id}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t} · Inu Arcade">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${SITE}/og/${id}.png">`;
  const out = html.replace(/<!--META-->[\s\S]*<!--\/META-->/, `<!--META-->\n${meta}\n<!--/META-->`);
  fs.mkdirSync(id, { recursive: true }); fs.writeFileSync(`${id}/index.html`, out);
}
console.log('pages built:', Object.keys(GAMES).join(', '));
