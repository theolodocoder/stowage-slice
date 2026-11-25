// Illustrative Ultramax-class bulk carrier and loading maths for a demo.
// Numbers are simplified and NOT class-approved: hydrostatics are held constant and the
// strength curves come from a coarse weight-minus-buoyancy model, shown only as % of allowable.

export type CargoId = 'iron-ore' | 'coal' | 'wheat' | 'bauxite'

export const CARGOES: Record<CargoId, { name: string; sf: number; fill: string; dot: string }> = {
  // sf = stowage factor, m³ one tonne takes up
  'iron-ore': { name: 'Iron ore', sf: 0.4, fill: '#9f1239', dot: 'bg-rose-800' },
  bauxite: { name: 'Bauxite', sf: 0.85, fill: '#c2410c', dot: 'bg-orange-700' },
  coal: { name: 'Coal', sf: 1.3, fill: '#292524', dot: 'bg-stone-800' },
  wheat: { name: 'Wheat (grain)', sf: 1.3, fill: '#d97706', dot: 'bg-amber-600' },
}

export interface Hold {
  id: number
  aft: number // m from aft perpendicular
  fwd: number
  volume: number // m³
  maxTonnes: number // tank-top / hold mass limit (sea)
}

export const VESSEL = {
  name: 'MV Demo Spirit',
  type: 'Ultramax bulk carrier (illustrative)',
  lbp: 192,
  depth: 18.9,
  lightship: 10_500,
  lightshipLcg: 82,
  lightshipKg: 9.6,
  lcb: 101,
  tpc: 56, // tonnes per cm immersion
  mctc: 880, // t·m per cm trim
  km: 13.4, // metacentre above keel (held constant)
  summerDraft: 13.3,
  maxTrim: 2.5,
  minGm: 0.3,
  doubleBottom: 1.9,
  holdHeight: 17,
  holds: [
    { id: 5, aft: 40, fwd: 66, volume: 13_500, maxTonnes: 16_000 },
    { id: 4, aft: 66, fwd: 94, volume: 15_000, maxTonnes: 19_000 },
    { id: 3, aft: 94, fwd: 122, volume: 15_000, maxTonnes: 19_000 },
    { id: 2, aft: 122, fwd: 150, volume: 15_000, maxTonnes: 19_000 },
    { id: 1, aft: 150, fwd: 174, volume: 12_500, maxTonnes: 14_000 },
  ] satisfies Hold[],
}

export type ConditionId = 'departure' | 'arrival'
export const CONSUMABLES: Record<ConditionId, { label: string; items: { name: string; tonnes: number; lcg: number; kg: number }[] }> = {
  departure: {
    label: 'Departure',
    items: [
      { name: 'Fuel oil', tonnes: 1500, lcg: 30, kg: 2 },
      { name: 'Fresh water', tonnes: 250, lcg: 14, kg: 8 },
    ],
  },
  arrival: {
    label: 'Arrival',
    items: [
      { name: 'Fuel oil', tonnes: 350, lcg: 30, kg: 1.2 },
      { name: 'Fresh water', tonnes: 80, lcg: 14, kg: 4 },
    ],
  },
}

export interface Parcel { cargo: CargoId; tonnes: number }
export type Plan = Record<number, Parcel | undefined> // one cargo per hold

export interface Issue { id: string; holdId?: number; severity: 'fail' | 'warn'; text: string }

export interface Condition {
  cargo: number
  consumables: number
  displacement: number
  deadweight: number
  lcg: number
  kg: number
  gm: number
  meanDraft: number
  trim: number // m, + = by the head
  draftFwd: number
  draftAft: number
  maxSf: number // % of allowable
  maxBm: number
  sf: number[] // % of allowable per station
  bm: number[]
  holdUse: Record<number, { tonnes: number; volumePct: number; heightM: number }>
  issues: Issue[]
}

export const STATIONS = 97 // every 2 m over the LBP
const DX = VESSEL.lbp / (STATIONS - 1)
const xs = Array.from({ length: STATIONS }, (_, i) => i * DX)

// Allowable envelopes (illustrative): shear flat, bending peaks amidships. Harbour limits are higher.
const SF_ALLOW = 9_500 // t
const BM_ALLOW = (x: number) => 340_000 * (0.25 + 0.75 * Math.sin((Math.PI * x) / VESSEL.lbp)) // t·m
export const HARBOUR_FACTOR = 1.25

const r2 = (n: number) => Math.round(n * 100) / 100

export function computeCondition(plan: Plan, cond: ConditionId = 'departure', opts: { portDraft?: number; limitFactor?: number } = {}): Condition {
  const v = VESSEL
  const issues: Issue[] = []
  const limit = opts.limitFactor ?? 1
  const w = new Array(STATIONS).fill(0)
  const spread = (tonnes: number, from: number, to: number) => {
    const idx = xs.map((x, i) => (x >= from && x < to ? i : -1)).filter((i) => i >= 0)
    for (const i of idx) w[i] += tonnes / idx.length
  }

  // Lightship: engine room aft is heavier, the rest spread along the hull.
  spread(v.lightship * 0.35, 0, 40)
  spread(v.lightship * 0.55, 40, 174)
  spread(v.lightship * 0.1, 174, v.lbp + 0.01)

  let moment = 0
  let vmoment = v.lightship * v.lightshipKg
  const cons = CONSUMABLES[cond].items
  const consumables = cons.reduce((s, c) => s + c.tonnes, 0)
  for (const c of cons) { spread(c.tonnes, c.lcg - 8, c.lcg + 8); vmoment += c.tonnes * c.kg }

  let cargo = 0
  const holdUse: Condition['holdUse'] = {}
  for (const h of v.holds) {
    const p = plan[h.id]
    const tonnes = p?.tonnes ?? 0
    const volume = p ? tonnes * CARGOES[p.cargo].sf : 0
    const heightM = (volume / h.volume) * v.holdHeight
    holdUse[h.id] = { tonnes, volumePct: Math.round((volume / h.volume) * 100), heightM }
    cargo += tonnes
    if (tonnes) { spread(tonnes, h.aft, h.fwd); vmoment += tonnes * (v.doubleBottom + heightM / 2) }
    if (tonnes > h.maxTonnes * limit)
      issues.push({ id: `mass-${h.id}`, holdId: h.id, severity: 'fail', text: `Hold ${h.id}: ${fmt(tonnes)} t is over its ${fmt(h.maxTonnes * limit)} t limit.` })
    else if (tonnes > h.maxTonnes * limit * 0.95)
      issues.push({ id: `mass-${h.id}`, holdId: h.id, severity: 'warn', text: `Hold ${h.id}: within 5% of its mass limit.` })
    if (volume > h.volume)
      issues.push({ id: `vol-${h.id}`, holdId: h.id, severity: 'fail', text: `Hold ${h.id}: ${p ? CARGOES[p.cargo].name.toLowerCase() : 'cargo'} needs ${fmt(volume)} m³, the hold has ${fmt(h.volume)} m³.` })
  }

  const displacement = w.reduce((s, x) => s + x, 0)
  moment = w.reduce((s, x, i) => s + x * xs[i], 0)
  const lcg = moment / displacement
  const kg = vmoment / displacement
  const gm = v.km - kg
  const meanDraft = displacement / (v.tpc * 100)
  const trim = (displacement * (lcg - v.lcb)) / v.mctc / 100
  const draftFwd = meanDraft + trim / 2
  const draftAft = meanDraft - trim / 2

  // Buoyancy: fuller amidships, fine at the ends, tilted so its centre sits under the LCG (equilibrium).
  const shape = xs.map((x) => Math.max(0.05, 1 - Math.pow((x - v.lbp / 2) / (v.lbp / 2), 6)))
  const s0 = shape.reduce((a, b) => a + b, 0)
  const s1 = shape.reduce((a, b, i) => a + b * xs[i], 0)
  const s2 = shape.reduce((a, b, i) => a + b * xs[i] * xs[i], 0)
  // b_i = shape_i * (A + B·x_i); solve so Σb = Δ and Σb·x = Δ·LCG
  const det = s0 * s2 - s1 * s1
  const A = (displacement * s2 - displacement * lcg * s1) / det
  const B = (displacement * lcg * s0 - displacement * s1) / det
  const b = shape.map((s, i) => s * (A + B * xs[i]))

  const sfT: number[] = []
  const bmT: number[] = []
  let sf = 0
  let bm = 0
  for (let i = 0; i < STATIONS; i++) {
    sf += w[i] - b[i]
    bm += sf * DX
    sfT.push(sf)
    bmT.push(bm)
  }
  const sfPct = sfT.map((x) => Math.round((Math.abs(x) / (SF_ALLOW * limit)) * 100))
  const bmPct = bmT.map((x, i) => Math.round((Math.abs(x) / (BM_ALLOW(xs[i]) * limit)) * 100))
  const maxSf = cargo ? Math.max(...sfPct) : 0
  const maxBm = cargo ? Math.max(...bmPct) : 0

  const deepest = Math.max(draftFwd, draftAft)
  // With no cargo the real ship would be in a ballast condition, which this demo doesn't model.
  if (cargo === 0) return { cargo, consumables, displacement: Math.round(displacement), deadweight: Math.round(displacement - v.lightship), lcg: r2(lcg), kg: r2(kg), gm: r2(gm), meanDraft: r2(meanDraft), trim: r2(trim), draftFwd: r2(draftFwd), draftAft: r2(draftAft), maxSf: 0, maxBm: 0, sf: sfPct.map(() => 0), bm: bmPct.map(() => 0), holdUse, issues }
  const maxDraft = Math.min(v.summerDraft, opts.portDraft ?? v.summerDraft)
  if (deepest > maxDraft)
    issues.push({ id: 'draft', severity: 'fail', text: `Deepest draft ${r2(deepest)} m is over the ${opts.portDraft && opts.portDraft < v.summerDraft ? 'port limit' : 'load line'} of ${maxDraft} m.` })
  // Harbour (intermediate) stages accept more trim than the sea-going condition.
  const trimLimit = limit > 1 ? v.maxTrim * 1.6 : v.maxTrim
  if (Math.abs(trim) > trimLimit)
    issues.push({ id: 'trim', severity: 'fail', text: `Trim ${r2(Math.abs(trim))} m by the ${trim > 0 ? 'head' : 'stern'} is over the ${trimLimit} m limit.` })
  else if (trim > 0.3)
    issues.push({ id: 'trim', severity: 'warn', text: `Trimmed by the head (${r2(trim)} m). Most masters want her slightly by the stern.` })
  if (gm < v.minGm) issues.push({ id: 'gm', severity: 'fail', text: `GM ${r2(gm)} m is below the ${v.minGm} m minimum.` })
  if (maxSf > 100) issues.push({ id: 'sf', holdId: holdAt(sfPct), severity: 'fail', text: `Shear force at ${maxSf}% of allowable near hold ${holdAt(sfPct) ?? '–'}.` })
  else if (maxSf > 85) issues.push({ id: 'sf', holdId: holdAt(sfPct), severity: 'warn', text: `Shear force at ${maxSf}% of allowable.` })
  if (maxBm > 100) issues.push({ id: 'bm', holdId: holdAt(bmPct), severity: 'fail', text: `Bending moment at ${maxBm}% of allowable near hold ${holdAt(bmPct) ?? '–'}.` })
  else if (maxBm > 85) issues.push({ id: 'bm', holdId: holdAt(bmPct), severity: 'warn', text: `Bending moment at ${maxBm}% of allowable.` })

  return {
    cargo,
    consumables,
    displacement: Math.round(displacement),
    deadweight: Math.round(displacement - v.lightship),
    lcg: r2(lcg),
    kg: r2(kg),
    gm: r2(gm),
    meanDraft: r2(meanDraft),
    trim: r2(trim),
    draftFwd: r2(draftFwd),
    draftAft: r2(draftAft),
    maxSf,
    maxBm,
    sf: sfPct,
    bm: bmPct,
    holdUse,
    issues,
  }
}

function holdAt(pct: number[]): number | undefined {
  const i = pct.indexOf(Math.max(...pct))
  const x = xs[i]
  return VESSEL.holds.find((h) => x >= h.aft && x < h.fwd)?.id ?? nearestHold(x)
}
const nearestHold = (x: number) =>
  [...VESSEL.holds].sort((a, b) => Math.abs((a.aft + a.fwd) / 2 - x) - Math.abs((b.aft + b.fwd) / 2 - x))[0]?.id

/** Tonnes that can still be loaded before the deepest draft reaches the limit (keeping the current trim). */
export function remainingCargo(c: Condition, limitDraft: number) {
  const deepest = Math.max(c.draftFwd, c.draftAft)
  return Math.max(0, Math.floor((limitDraft - deepest) * VESSEL.tpc * 100))
}

/** Pour the plan in equal steps across all holds; intermediate stages are checked against harbour limits. */
export function loadingSequence(plan: Plan, steps = [0.25, 0.5, 0.75, 1]) {
  return steps.map((f, i) => {
    const partial: Plan = {}
    for (const h of VESSEL.holds) {
      const p = plan[h.id]
      if (p) partial[h.id] = { ...p, tonnes: Math.round(p.tonnes * f) }
    }
    const last = i === steps.length - 1
    return { fraction: f, last, condition: computeCondition(partial, 'departure', { limitFactor: last ? 1 : HARBOUR_FACTOR }) }
  })
}

export const PRESETS: Record<string, { label: string; note: string; plan: Plan }> = {
  homogeneous: {
    label: 'Homogeneous',
    note: 'Coal in every hold, filled by volume.',
    plan: {
      1: { cargo: 'coal', tonnes: 9_400 }, 2: { cargo: 'coal', tonnes: 11_300 }, 3: { cargo: 'coal', tonnes: 11_300 },
      4: { cargo: 'coal', tonnes: 11_300 }, 5: { cargo: 'coal', tonnes: 10_100 },
    },
  },
  alternate: {
    label: 'Alternate holds',
    note: 'Iron ore in holds 1, 3 and 5, the rest empty.',
    plan: { 1: { cargo: 'iron-ore', tonnes: 13_500 }, 3: { cargo: 'iron-ore', tonnes: 18_500 }, 5: { cargo: 'iron-ore', tonnes: 15_000 } },
  },
  block: {
    label: 'Block loading',
    note: 'Iron ore packed into holds 2–4.',
    plan: { 2: { cargo: 'iron-ore', tonnes: 13_000 }, 3: { cargo: 'iron-ore', tonnes: 14_000 }, 4: { cargo: 'iron-ore', tonnes: 13_000 } },
  },
  unsafe: {
    label: 'Unsafe example',
    note: 'Overloaded forward holds and wheat that will not fit.',
    plan: { 1: { cargo: 'iron-ore', tonnes: 15_000 }, 2: { cargo: 'iron-ore', tonnes: 19_500 }, 5: { cargo: 'wheat', tonnes: 11_000 } },
  },
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
export { xs as STATION_X }
