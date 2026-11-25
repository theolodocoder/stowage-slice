import { useMemo, useState } from 'react'
import { usePlan, STEP } from './store'
import { CARGOES, VESSEL, computeCondition, fmt, type CargoId, type Plan } from './vessel'

const SAMPLE_GOOD: Plan = {
  1: [{ cargo: 'iron-ore', tonnes: 8000 }],
  2: [{ cargo: 'iron-ore', tonnes: 11000 }],
  3: [{ cargo: 'iron-ore', tonnes: 11000 }],
  4: [{ cargo: 'iron-ore', tonnes: 11000 }],
  5: [{ cargo: 'iron-ore', tonnes: 9000 }],
}
const SAMPLE_BAD: Plan = {
  1: [{ cargo: 'iron-ore', tonnes: 12000 }],
  2: [{ cargo: 'grain', tonnes: 2000 }, { cargo: 'coal', tonnes: 1000 }],
  3: [{ cargo: 'iron-ore', tonnes: 15000 }],
  5: [{ cargo: 'coal', tonnes: 11000 }],
}

export default function App() {
  const { plan, add, remove, clear, save, saved } = usePlan()
  const [selected, setSelected] = useState<CargoId>('iron-ore')
  const [over, setOver] = useState<number | null>(null)
  const c = useMemo(() => computeCondition(plan), [plan])
  const holdsFwdFirst = [...VESSEL.holds].sort((a, b) => b.lcg - a.lcg)
  const ok = c.problems.length === 0 && c.cargoTonnes > 0

  const loadSample = (p: Plan) => usePlan.setState({ plan: structuredClone(p), saved: null })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Stowage plan · demo slice</p>
          <h1 className="text-2xl font-bold">{VESSEL.name}</h1>
          <p className="text-sm text-slate-600">
            Drag cargo into a hold, or pick a cargo and use the buttons. Every change re-checks drafts, trim, hull bending and hold limits.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50" onClick={() => loadSample(SAMPLE_GOOD)}>Load a safe plan</button>
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50" onClick={() => loadSample(SAMPLE_BAD)}>Load an unsafe plan</button>
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50" onClick={clear}>Clear</button>
        </div>
      </header>

      <section aria-label="Cargo" className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Cargo ({fmt(STEP)} t per drop):</span>
        {(Object.keys(CARGOES) as CargoId[]).map((id) => (
          <button
            key={id}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); setSelected(id) }}
            onClick={() => setSelected(id)}
            aria-pressed={selected === id}
            className={`flex cursor-grab items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${selected === id ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-300 bg-white'}`}
          >
            <span className={`h-3 w-3 rounded-full ${CARGOES[id].color}`} />
            {CARGOES[id].name}
            <span className="text-xs text-slate-500">SF {CARGOES[id].stowageFactor}</span>
          </button>
        ))}
      </section>

      <section aria-label="Holds, bow on the right" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
          <span>Aft · engine room</span><span>Bow →</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[...holdsFwdFirst].reverse().map((h) => {
            const use = c.holdUse[h.id]
            const parcels = plan[h.id] ?? []
            const bad = c.problems.some((p) => p.startsWith(`Hold ${h.id}:`))
            const pct = Math.min(100, (use.tonnes / h.maxTonnes) * 100)
            return (
              <div
                key={h.id}
                onDragOver={(e) => { e.preventDefault(); setOver(h.id) }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); add(h.id, e.dataTransfer.getData('text/plain') as CargoId) }}
                className={`flex flex-col rounded-xl border-2 p-2 transition ${bad ? 'border-red-500 bg-red-50' : over === h.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Hold {h.id}</span>
                  <span className="text-xs text-slate-500">max {fmt(h.maxTonnes)} t</span>
                </div>
                <div className="relative mt-2 h-28 overflow-hidden rounded-md border border-slate-300 bg-white" aria-hidden>
                  <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse" style={{ height: `${pct}%` }}>
                    {parcels.map((p) => (
                      <div key={p.cargo} className={`${CARGOES[p.cargo].color} w-full`} style={{ flexGrow: p.tonnes }} />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium tabular-nums">{fmt(use.tonnes)} t</p>
                <p className="text-xs text-slate-500 tabular-nums">{fmt(use.volumeUsed)} / {fmt(h.volume)} m³</p>
                <div className="mt-2 flex gap-1">
                  <button aria-label={`Add ${fmt(STEP)} t of ${CARGOES[selected].name} to hold ${h.id}`} onClick={() => add(h.id, selected)} className="flex-1 rounded-md bg-sky-700 py-1 text-sm font-medium text-white hover:bg-sky-800">+{fmt(STEP)}</button>
                  <button aria-label={`Remove ${fmt(STEP)} t from hold ${h.id}`} onClick={() => remove(h.id)} className="flex-1 rounded-md border border-slate-300 bg-white py-1 text-sm hover:bg-slate-100">−</button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-label="Loading condition" className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
          <h2 className="font-semibold">Condition</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Cargo" value={`${fmt(c.cargoTonnes)} t`} />
            <Stat label="Displacement" value={`${fmt(c.displacement)} t`} />
            <Stat label="Draft fwd / aft" value={`${c.draftFwd} / ${c.draftAft} m`} warn={Math.max(c.draftFwd, c.draftAft) > VESSEL.maxDraft} />
            <Stat label={`Trim (limit ${VESSEL.maxTrim} m)`} value={`${Math.abs(c.trim)} m ${c.trim > 0 ? 'head' : c.trim < 0 ? 'stern' : ''}`} warn={Math.abs(c.trim) > VESSEL.maxTrim} />
          </dl>
          <div className="mt-4">
            <div className="flex justify-between text-sm"><span>Hull bending (simplified)</span><span className="tabular-nums">{c.stress}% of allowable</span></div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={c.stress} aria-valuemin={0} aria-valuemax={150} aria-label="Hull bending">
              <div className={`h-full ${c.stress > 100 ? 'bg-red-500' : c.stress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (c.stress / 150) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Checks</h2>
          {c.cargoTonnes === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No cargo loaded yet.</p>
          ) : c.problems.length === 0 ? (
            <p className="mt-2 text-sm text-emerald-700">All checks pass.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-red-700" aria-live="polite">
              {c.problems.map((p) => <li key={p}>• {p}</li>)}
            </ul>
          )}
          <button
            disabled={!ok}
            onClick={save}
            className="mt-4 w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {ok ? 'Save loading plan' : 'Fix the checks to save'}
          </button>
          {saved && <p className="mt-2 text-xs text-emerald-700">Saved at {saved} (demo only, nothing is stored).</p>}
        </div>
      </section>

      <footer className="mt-6 text-xs leading-relaxed text-slate-500">
        Built in about an hour by Promise Okafor as a sample for your stowage editor. React, Vite, TypeScript, Zustand, Tailwind; the rules are unit-tested with Vitest.
        The vessel and the maths are simplified and illustrative (constant hydrostatics, a rough bending check). A real version would use your naval architect's tables and the Python engine.
      </footer>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-base font-semibold tabular-nums ${warn ? 'text-red-600' : ''}`}>{value}</dd>
    </div>
  )
}
