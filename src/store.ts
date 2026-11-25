import { create } from 'zustand'
import { CARGOES, CONSUMABLES, PRESETS, VESSEL, type CargoId, type ConditionId, type Plan } from './vessel'

export const STEP = 1_000 // tonnes per drop / click

interface State {
  plan: Plan
  cargo: CargoId
  condition: ConditionId
  portDraft: number
  selectedHold: number | null
  preset: string | null
  saved: string | null
  past: Plan[]
  future: Plan[]
  undo: () => void
  redo: () => void
  setCargo: (c: CargoId) => void
  setCondition: (c: ConditionId) => void
  setPortDraft: (m: number) => void
  selectHold: (id: number | null) => void
  add: (holdId: number, cargo?: CargoId, tonnes?: number) => void
  remove: (holdId: number) => void
  setTonnes: (holdId: number, tonnes: number) => void
  setHoldCargo: (holdId: number, cargo: CargoId | null) => void
  loadPreset: (key: string) => void
  clear: () => void
  save: () => void
}

// Share links: #plan=1.coal.9400~3.iron-ore.13500&cond=arrival&draft=12.5
export function encodeShare(plan: Plan, cond: ConditionId, draft: number) {
  const holds = Object.entries(plan).flatMap(([id, p]) => (p ? [`${id}.${p.cargo}.${p.tonnes}`] : []))
  return new URLSearchParams({ plan: holds.join('~'), cond, draft: String(draft) }).toString()
}

// The hash is untrusted input: unknown holds, cargoes or bad numbers are dropped.
export function decodeShare(hash: string): { plan: Plan; condition: ConditionId; portDraft: number } | null {
  const q = new URLSearchParams(hash.replace(/^#/, ''))
  if (!q.has('plan')) return null
  const plan: Plan = {}
  for (const part of (q.get('plan') ?? '').split('~')) {
    const [id, cargo, t] = part.split('.')
    const hold = Number(id), tonnes = Math.round(Number(t))
    if (VESSEL.holds.some((h) => h.id === hold) && cargo in CARGOES && tonnes > 0 && tonnes <= 50_000)
      plan[hold] = { cargo: cargo as CargoId, tonnes }
  }
  const cond = q.get('cond')
  const draft = Number(q.get('draft'))
  return {
    plan,
    condition: cond && cond in CONSUMABLES ? (cond as ConditionId) : 'departure',
    portDraft: draft >= 6 && draft <= VESSEL.summerDraft ? draft : VESSEL.summerDraft,
  }
}

const shared = typeof location === 'undefined' ? null : decodeShare(location.hash)

// Every plan edit goes through here so it lands on the undo stack.
const edit = (s: State, plan: Plan, extra: Partial<State> = {}): Partial<State> => ({
  plan, past: [...s.past.slice(-49), s.plan], future: [], preset: null, saved: null, ...extra,
})

export const usePlan = create<State>((set, get) => ({
  plan: shared?.plan ?? structuredClone(PRESETS.homogeneous.plan),
  cargo: 'coal',
  condition: shared?.condition ?? 'departure',
  portDraft: shared?.portDraft ?? VESSEL.summerDraft,
  selectedHold: null,
  preset: shared ? null : 'homogeneous',
  saved: null,
  past: [],
  future: [],
  undo: () => set((s) => s.past.length ? { plan: s.past.at(-1)!, past: s.past.slice(0, -1), future: [s.plan, ...s.future], preset: null, saved: null } : s),
  redo: () => set((s) => s.future.length ? { plan: s.future[0], future: s.future.slice(1), past: [...s.past, s.plan], preset: null, saved: null } : s),
  setCargo: (cargo) => set({ cargo }),
  setCondition: (condition) => set({ condition }),
  setPortDraft: (portDraft) => set({ portDraft }),
  selectHold: (selectedHold) => set({ selectedHold }),
  add: (holdId, cargo = get().cargo, tonnes = STEP) =>
    set((s) => {
      const cur = s.plan[holdId]
      // One cargo per hold: dropping a different cargo replaces what's there.
      const next = cur && cur.cargo === cargo ? { cargo, tonnes: cur.tonnes + tonnes } : { cargo, tonnes }
      return edit(s, { ...s.plan, [holdId]: next }, { selectedHold: holdId })
    }),
  remove: (holdId) =>
    set((s) => {
      const cur = s.plan[holdId]
      if (!cur) return s
      const tonnes = cur.tonnes - STEP
      return edit(s, { ...s.plan, [holdId]: tonnes > 0 ? { ...cur, tonnes } : undefined })
    }),
  setTonnes: (holdId, tonnes) =>
    set((s) => {
      const cur = s.plan[holdId]
      const t = Math.max(0, Math.round(tonnes || 0))
      return edit(s, { ...s.plan, [holdId]: t > 0 ? { cargo: cur?.cargo ?? s.cargo, tonnes: t } : undefined })
    }),
  setHoldCargo: (holdId, cargo) =>
    set((s) => {
      const cur = s.plan[holdId]
      return edit(s, { ...s.plan, [holdId]: cargo ? { cargo, tonnes: cur?.tonnes ?? STEP } : undefined }, { selectedHold: holdId })
    }),
  loadPreset: (key) => set((s) => edit(s, structuredClone(PRESETS[key].plan), { preset: key, selectedHold: null })),
  clear: () => set((s) => edit(s, {}, { selectedHold: null })),
  save: () => set({ saved: new Date().toLocaleTimeString() }),
}))
