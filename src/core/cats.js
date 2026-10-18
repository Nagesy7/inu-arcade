// Shared cat-gang personality system (Kibble Chomp, Street Sniffer). Pure targeting: given what the cat "knows" about the
// dog, return the tile it heads for. Each cabinet keeps its own map, speeds, timers and movement rules.
//   0 TRACKER  follows the dog's scent trail, `lag` marks behind
//   1 GUARD    camps the guard spot (power-up / hydrant) nearest the dog, pounces once the dog is within `pounce` tiles
//   2 FLANKER  cuts in `flank` tiles off the dog's right-hand side
//   3 MOODY    hunts for `swap` seconds, then wanders between beds, and back
export const ROLES = ['TRACKER', 'GUARD', 'FLANKER', 'MOODY'];
const DIRV = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
export function personalityTarget(i, { P, dir, trail = [], lag = 8, guards = [], pounce = 3, flank = 5, beds, roundF = 0, swap = 3 }) {
  const d = DIRV[dir] || [0, 0];
  if (i === 0) return trail.length > lag ? trail[trail.length - 1 - lag] : P;
  if (i === 1) { let best = null, bd = Infinity; for (const g of guards) { const dd = (g.x - P.x) ** 2 + (g.y - P.y) ** 2; if (dd < bd) { bd = dd; best = g; } }
    return best && bd > pounce * pounce ? best : P; }
  if (i === 2) return { x: P.x - d[1] * flank, y: P.y + d[0] * flank };
  if (Math.floor(roundF / (swap * 60)) % 2 === 0) return P;
  return beds[(i + Math.floor(roundF / (swap * 120))) % beds.length];
}
