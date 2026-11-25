import { create } from 'zustand'
import { PRESETS, VESSEL, type CargoId, type ConditionId, type Plan } from './vessel'

export const STEP = 1_000 // tonnes per drop / click

interface State {
  plan: Plan
  cargo: CargoId
  condition: ConditionId
  portDraft: number
  selectedHold: number | null
  preset: string | null
  saved: string | null
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

export const usePlan = create<State>((set, get) => ({
  plan: structuredClone(PRESETS.homogeneous.plan),
  cargo: 'coal',
  condition: 'departure',
  portDraft: VESSEL.summerDraft,
  selectedHold: null,
  preset: 'homogeneous',
  saved: null,
  setCargo: (cargo) => set({ cargo }),
  setCondition: (condition) => set({ condition }),
  setPortDraft: (portDraft) => set({ portDraft }),
  selectHold: (selectedHold) => set({ selectedHold }),
  add: (holdId, cargo = get().cargo, tonnes = STEP) =>
    set((s) => {
      const cur = s.plan[holdId]
      // One cargo per hold: dropping a different cargo replaces what's there.
      const next = cur && cur.cargo === cargo ? { cargo, tonnes: cur.tonnes + tonnes } : { cargo, tonnes }
      return { plan: { ...s.plan, [holdId]: next }, selectedHold: holdId, preset: null, saved: null }
    }),
  remove: (holdId) =>
    set((s) => {
      const cur = s.plan[holdId]
      if (!cur) return s
      const tonnes = cur.tonnes - STEP
      return { plan: { ...s.plan, [holdId]: tonnes > 0 ? { ...cur, tonnes } : undefined }, preset: null, saved: null }
    }),
  setTonnes: (holdId, tonnes) =>
    set((s) => {
      const cur = s.plan[holdId]
      const t = Math.max(0, Math.round(tonnes || 0))
      return { plan: { ...s.plan, [holdId]: t > 0 ? { cargo: cur?.cargo ?? s.cargo, tonnes: t } : undefined }, preset: null, saved: null }
    }),
  setHoldCargo: (holdId, cargo) =>
    set((s) => {
      const cur = s.plan[holdId]
      return { plan: { ...s.plan, [holdId]: cargo ? { cargo, tonnes: cur?.tonnes ?? STEP } : undefined }, selectedHold: holdId, preset: null, saved: null }
    }),
  loadPreset: (key) => set({ plan: structuredClone(PRESETS[key].plan), preset: key, selectedHold: null, saved: null }),
  clear: () => set({ plan: {}, preset: null, selectedHold: null, saved: null }),
  save: () => set({ saved: new Date().toLocaleTimeString() }),
}))
