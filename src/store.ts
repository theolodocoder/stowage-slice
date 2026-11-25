import { create } from 'zustand'
import type { CargoId, Plan } from './vessel'

export const STEP = 1_000 // tonnes per drop / click

interface State {
  plan: Plan
  saved: string | null
  add: (holdId: number, cargo: CargoId, tonnes?: number) => void
  remove: (holdId: number) => void
  clear: () => void
  save: () => void
}

export const usePlan = create<State>((set) => ({
  plan: {},
  saved: null,
  add: (holdId, cargo, tonnes = STEP) =>
    set((s) => {
      const parcels = [...(s.plan[holdId] ?? [])]
      const same = parcels.findIndex((p) => p.cargo === cargo)
      if (same >= 0) parcels[same] = { ...parcels[same], tonnes: parcels[same].tonnes + tonnes }
      else parcels.push({ cargo, tonnes })
      return { plan: { ...s.plan, [holdId]: parcels }, saved: null }
    }),
  remove: (holdId) =>
    set((s) => {
      const parcels = [...(s.plan[holdId] ?? [])]
      const last = parcels.at(-1)
      if (!last) return s
      if (last.tonnes > STEP) parcels[parcels.length - 1] = { ...last, tonnes: last.tonnes - STEP }
      else parcels.pop()
      return { plan: { ...s.plan, [holdId]: parcels }, saved: null }
    }),
  clear: () => set({ plan: {}, saved: null }),
  save: () => set({ saved: new Date().toLocaleTimeString() }),
}))
