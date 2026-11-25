// Illustrative vessel and loading maths for a demo. Numbers are simplified and NOT class-approved.
// A real loading computer interpolates hydrostatic tables per draft; here they are held constant.

export type CargoId = 'iron-ore' | 'coal' | 'grain'

export const CARGOES: Record<CargoId, { name: string; stowageFactor: number; color: string }> = {
  // stowage factor = cubic metres one tonne takes up
  'iron-ore': { name: 'Iron ore', stowageFactor: 0.33, color: 'bg-rose-700' },
  coal: { name: 'Coal', stowageFactor: 1.25, color: 'bg-stone-800' },
  grain: { name: 'Grain (wheat)', stowageFactor: 1.4, color: 'bg-amber-500' },
}

export interface Hold {
  id: number
  lcg: number // longitudinal centre of the hold, metres forward of the aft perpendicular
  volume: number // m³
  maxTonnes: number // tank-top strength limit
}

export const VESSEL = {
  name: 'MV Demo Spirit (Supramax, illustrative)',
  lightship: 11_000, // tonnes incl. stores and constants
  lightshipLcg: 84,
  lcb: 99, // longitudinal centre of buoyancy, m from AP (held constant)
  midship: 99,
  tpc: 55, // tonnes per cm immersion
  mctc: 900, // moment to change trim 1 cm, t·m
  maxDraft: 12.8, // summer load line, m
  maxTrim: 2.0, // |trim| limit for this demo, m
  maxStress: 100, // % of allowable still-water bending moment
  holds: [
    { id: 1, lcg: 152, volume: 11_000, maxTonnes: 10_000 },
    { id: 2, lcg: 128, volume: 13_000, maxTonnes: 13_500 },
    { id: 3, lcg: 104, volume: 13_000, maxTonnes: 13_500 },
    { id: 4, lcg: 80, volume: 13_000, maxTonnes: 13_500 },
    { id: 5, lcg: 56, volume: 12_000, maxTonnes: 11_000 },
  ] satisfies Hold[],
}

export interface Parcel {
  cargo: CargoId
  tonnes: number
}
export type Plan = Record<number, Parcel[]> // hold id -> parcels

export interface Condition {
  cargoTonnes: number
  displacement: number
  lcg: number
  meanDraft: number
  trim: number // metres, + = by the head (bow down)
  draftFwd: number
  draftAft: number
  stress: number // % of allowable
  holdUse: Record<number, { tonnes: number; volumeUsed: number }>
  problems: string[]
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

export function computeCondition(plan: Plan, v = VESSEL): Condition {
  const problems: string[] = []
  let moment = v.lightship * v.lightshipLcg
  let cargoTonnes = 0
  const holdUse: Condition['holdUse'] = {}

  for (const h of v.holds) {
    const parcels = plan[h.id] ?? []
    const tonnes = parcels.reduce((s, p) => s + p.tonnes, 0)
    const volumeUsed = parcels.reduce((s, p) => s + p.tonnes * CARGOES[p.cargo].stowageFactor, 0)
    holdUse[h.id] = { tonnes, volumeUsed }
    cargoTonnes += tonnes
    moment += tonnes * h.lcg

    const kinds = new Set(parcels.map((p) => p.cargo))
    if (kinds.size > 1) problems.push(`Hold ${h.id}: one cargo per hold (it has ${kinds.size}).`)
    if (tonnes > h.maxTonnes) problems.push(`Hold ${h.id}: ${fmt(tonnes)} t is over the tank-top limit of ${fmt(h.maxTonnes)} t.`)
    if (volumeUsed > h.volume) problems.push(`Hold ${h.id}: cargo needs ${fmt(volumeUsed)} m³ but the hold has ${fmt(h.volume)} m³.`)
  }

  const displacement = v.lightship + cargoTonnes
  const lcg = moment / displacement
  const meanDraft = displacement / (v.tpc * 100)
  const trim = (displacement * (lcg - v.lcb)) / v.mctc / 100
  const draftFwd = meanDraft + trim / 2
  const draftAft = meanDraft - trim / 2

  // Simplified still-water bending: how unevenly weight sits along the hull compared with an even spread.
  const mean = cargoTonnes / v.holds.length
  const uneven = v.holds.reduce((s, h) => s + Math.abs((holdUse[h.id].tonnes - mean) * (h.lcg - v.midship)), 0)
  const stress = cargoTonnes === 0 ? 0 : (uneven / 1_400_000) * 100

  if (Math.max(draftFwd, draftAft) > v.maxDraft)
    problems.push(`Draft ${round(Math.max(draftFwd, draftAft))} m is over the load line (${v.maxDraft} m).`)
  if (Math.abs(trim) > v.maxTrim)
    problems.push(`Trim ${round(Math.abs(trim))} m by the ${trim > 0 ? 'head' : 'stern'} is over the ${v.maxTrim} m limit.`)
  if (stress > v.maxStress) problems.push(`Hull bending at ${Math.round(stress)}% of allowable. Spread the cargo more evenly.`)

  return {
    cargoTonnes,
    displacement,
    lcg: round(lcg),
    meanDraft: round(meanDraft),
    trim: round(trim),
    draftFwd: round(draftFwd),
    draftAft: round(draftAft),
    stress: Math.round(stress),
    holdUse,
    problems,
  }
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
