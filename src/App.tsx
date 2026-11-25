import { useMemo } from 'react'
import { usePlan, STEP } from './store'
import { ShipProfile } from './ShipProfile'
import { StrengthChart } from './StrengthChart'
import {
  CARGOES, CONSUMABLES, PRESETS, VESSEL, computeCondition, fmt, loadingSequence, remainingCargo,
  type CargoId, type ConditionId, type Issue,
} from './vessel'

export default function App() {
  const s = usePlan()
  const c = useMemo(() => computeCondition(s.plan, s.condition, { portDraft: s.portDraft }), [s.plan, s.condition, s.portDraft])
  const seq = useMemo(() => loadingSequence(s.plan), [s.plan])
  const fails = c.issues.filter((i) => i.severity === 'fail')
  const warns = c.issues.filter((i) => i.severity === 'warn')
  const failing = new Set(fails.flatMap((i) => (i.holdId ? [i.holdId] : [])))
  const limitDraft = Math.min(VESSEL.summerDraft, s.portDraft)
  const canSave = c.cargo > 0 && fails.length === 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#0b1726] text-white">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Stowage planner · demo slice</p>
            <h1 className="text-lg font-semibold">{VESSEL.name} <span className="font-normal text-slate-400">· {VESSEL.type}</span></h1>
          </div>
          <nav aria-label="Condition" className="flex rounded-lg bg-white/10 p-1 text-sm">
            {(Object.keys(CONSUMABLES) as ConditionId[]).map((k) => (
              <button key={k} onClick={() => s.setCondition(k)} aria-pressed={s.condition === k}
                className={`rounded-md px-3 py-1 ${s.condition === k ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-white/10'}`}>
                {CONSUMABLES[k].label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <StatusBadge fails={fails.length} warns={warns.length} empty={c.cargo === 0} />
            <button onClick={() => window.print()} className="no-print rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">Print report</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[88rem] gap-4 px-4 py-4 lg:grid-cols-[15rem_1fr_19rem]">
        {/* Left: cargo, presets, port */}
        <aside className="no-print space-y-4">
          <Card title="Cargo" hint={`Drag onto a hold, or pick one and click a hold's +. ${fmt(STEP)} t per step.`}>
            <div className="space-y-1.5">
              {(Object.keys(CARGOES) as CargoId[]).map((id) => (
                <button key={id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); s.setCargo(id) }}
                  onClick={() => s.setCargo(id)} aria-pressed={s.cargo === id}
                  className={`flex w-full cursor-grab items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm ${s.cargo === id ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${CARGOES[id].dot}`} />
                  <span className="flex-1 font-medium">{CARGOES[id].name}</span>
                  <span className="text-xs tabular-nums text-slate-500">SF {CARGOES[id].sf}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Standard conditions" hint="From a typical loading manual.">
            <div className="space-y-1.5">
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} onClick={() => s.loadPreset(k)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left ${s.preset === k ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-slate-500">{p.note}</span>
                </button>
              ))}
              <button onClick={s.clear} className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-200/60">Clear all holds</button>
            </div>
          </Card>
          <Card title="Port draft limit">
            <label className="flex items-center gap-2 text-sm">
              <input type="number" step="0.1" min="6" max={VESSEL.summerDraft} value={s.portDraft}
                onChange={(e) => s.setPortDraft(Math.min(VESSEL.summerDraft, Number(e.target.value) || VESSEL.summerDraft))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 tabular-nums" aria-label="Maximum draft at the load port in metres" />
              <span className="text-slate-500">m (load line {VESSEL.summerDraft} m)</span>
            </label>
            <p className="mt-2 text-sm">You can still load <b className="tabular-nums">{fmt(remainingCargo(c, limitDraft))} t</b> before the deepest draft reaches {limitDraft} m.</p>
          </Card>
        </aside>

        {/* Centre: profile + strength */}
        <section className="min-w-0 space-y-4">
          <Card title="Side profile" hint="Click a hold to inspect it. Bow on the right.">
            <ShipProfile plan={s.plan} c={c} selected={s.selectedHold} failing={failing}
              onSelect={(id) => s.selectHold(s.selectedHold === id ? null : id)}
              onDrop={(id, cargo) => s.add(id, cargo)} />
          </Card>
          <Card title="Longitudinal strength" hint={`% of allowable along the hull, ${s.condition} condition. Amber from 85%, red over 100%.`}>
            <StrengthChart c={c} selected={s.selectedHold} />
          </Card>
          <Card title="Holds">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-1.5 pr-3">Hold</th><th className="pr-3">Cargo</th><th className="pr-3">Tonnes</th><th className="pr-3">Limit</th><th className="pr-3">Volume used</th><th className="no-print">Adjust</th></tr>
                </thead>
                <tbody>
                  {[...VESSEL.holds].sort((a, b) => a.id - b.id).map((h) => {
                    const p = s.plan[h.id]
                    const use = c.holdUse[h.id]
                    const bad = failing.has(h.id)
                    return (
                      <tr key={h.id} onClick={() => s.selectHold(h.id)}
                        className={`border-t border-slate-100 ${s.selectedHold === h.id ? 'bg-sky-50' : ''} ${bad ? 'text-red-700' : ''}`}>
                        <td className="py-1.5 pr-3 font-semibold">H{h.id}</td>
                        <td className="pr-3">
                          <select value={p?.cargo ?? ''} aria-label={`Cargo in hold ${h.id}`}
                            onChange={(e) => s.setHoldCargo(h.id, (e.target.value || null) as CargoId | null)}
                            className="rounded border border-slate-200 bg-white px-1 py-0.5">
                            <option value="">Empty</option>
                            {(Object.keys(CARGOES) as CargoId[]).map((id) => <option key={id} value={id}>{CARGOES[id].name}</option>)}
                          </select>
                        </td>
                        <td className="pr-3">
                          <input type="number" step="500" min="0" value={use.tonnes || ''} placeholder="0" aria-label={`Tonnes in hold ${h.id}`}
                            onChange={(e) => s.setTonnes(h.id, Number(e.target.value))}
                            className="w-24 rounded border border-slate-200 px-1.5 py-0.5 tabular-nums" />
                        </td>
                        <td className="pr-3 tabular-nums text-slate-500">{fmt(h.maxTonnes)}</td>
                        <td className="pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${use.volumePct > 100 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${Math.min(100, use.volumePct)}%` }} /></div>
                            <span className="tabular-nums text-xs">{use.volumePct}%</span>
                          </div>
                        </td>
                        <td className="no-print">
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); s.add(h.id) }} className="rounded bg-sky-700 px-2 py-0.5 text-white hover:bg-sky-800" aria-label={`Add ${fmt(STEP)} t of ${CARGOES[s.cargo].name} to hold ${h.id}`}>+</button>
                            <button onClick={(e) => { e.stopPropagation(); s.remove(h.id) }} className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50" aria-label={`Remove ${fmt(STEP)} t from hold ${h.id}`}>−</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Loading sequence" hint="The plan poured in four equal steps. Intermediate stages use harbour limits (125%); the final stage uses sea limits.">
            <ol className="grid gap-2 sm:grid-cols-4">
              {seq.map((st) => {
                const f = st.condition.issues.filter((i) => i.severity === 'fail').length
                return (
                  <li key={st.fraction} className={`rounded-lg border p-2.5 text-sm ${f ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                    <p className="font-semibold">{st.last ? 'Final' : `Step ${seq.indexOf(st) + 1}`} · {Math.round(st.fraction * 100)}%</p>
                    <p className="tabular-nums text-slate-600">Drafts {st.condition.draftFwd} / {st.condition.draftAft} m</p>
                    <p className="tabular-nums text-slate-600">SF {st.condition.maxSf}% · BM {st.condition.maxBm}%</p>
                    <p className={`mt-1 text-xs font-medium ${f ? 'text-red-700' : 'text-emerald-700'}`}>{f ? `${f} check${f > 1 ? 's' : ''} failing` : 'Within limits'}</p>
                  </li>
                )
              })}
            </ol>
          </Card>
        </section>

        {/* Right: summary + checks */}
        <aside className="space-y-4">
          <Card title={`${CONSUMABLES[s.condition].label} condition`}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              <Stat label="Cargo" value={`${fmt(c.cargo)} t`} />
              <Stat label="Deadweight" value={`${fmt(c.deadweight)} t`} />
              <Stat label="Displacement" value={`${fmt(c.displacement)} t`} />
              <Stat label="Fuel + water" value={`${fmt(c.consumables)} t`} />
              <Stat label="Draft fwd" value={`${c.draftFwd} m`} bad={c.draftFwd > limitDraft} />
              <Stat label="Draft aft" value={`${c.draftAft} m`} bad={c.draftAft > limitDraft} />
              <Stat label="Trim" value={`${Math.abs(c.trim)} m ${c.trim > 0.005 ? 'head' : c.trim < -0.005 ? 'stern' : ''}`} bad={Math.abs(c.trim) > VESSEL.maxTrim} />
              <Stat label={`GM (min ${VESSEL.minGm} m)`} value={`${c.gm} m`} bad={c.gm < VESSEL.minGm} />
            </dl>
            <Meter label="Shear force" pct={c.maxSf} />
            <Meter label="Bending moment" pct={c.maxBm} />
          </Card>
          <Card title="Checks">
            {c.cargo === 0 ? <p className="text-sm text-slate-500">No cargo loaded.</p> : c.issues.length === 0 ? (
              <p className="text-sm font-medium text-emerald-700">All checks pass.</p>
            ) : (
              <ul className="space-y-1.5" aria-live="polite">
                {[...fails, ...warns].map((i) => <IssueRow key={i.id} i={i} onClick={() => i.holdId && s.selectHold(i.holdId)} />)}
              </ul>
            )}
            <button disabled={!canSave} onClick={s.save}
              className="no-print mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              {canSave ? 'Approve loading plan' : fails.length ? `Fix ${fails.length} failing check${fails.length > 1 ? 's' : ''} to approve` : 'Load cargo to approve'}
            </button>
            {s.saved && <p className="mt-2 text-xs text-emerald-700">Approved at {s.saved} (demo, nothing is stored).</p>}
          </Card>
        </aside>
      </main>

      <footer className="mx-auto max-w-[88rem] px-4 pb-8 text-xs leading-relaxed text-slate-500">
        A sample built by Promise Okafor for a stowage-planning proposal: React, Vite, TypeScript, Zustand and Tailwind, with the checks unit-tested in Vitest.
        The vessel, hydrostatics and strength model are simplified and illustrative, not class-approved. A real version would read the approved loading manual and your calculation engine.
      </footer>
    </div>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {hint && <p className="mb-2.5 mt-0.5 text-xs text-slate-500">{hint}</p>}
      {!hint && <div className="mb-2.5" />}
      {children}
    </section>
  )
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-semibold tabular-nums ${bad ? 'text-red-600' : ''}`}>{value}</dd>
    </div>
  )
}

function Meter({ label, pct }: { label: string; pct: number }) {
  const color = pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-semibold tabular-nums">{pct}%</span></div>
      <div className="relative mt-1 h-2 rounded-full bg-slate-100" role="meter" aria-label={`${label} % of allowable`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={140}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (pct / 140) * 100)}%` }} />
        <div className="absolute top-[-3px] h-[14px] w-px bg-red-500" style={{ left: `${(100 / 140) * 100}%` }} />
      </div>
    </div>
  )
}

function IssueRow({ i, onClick }: { i: Issue; onClick: () => void }) {
  const fail = i.severity === 'fail'
  return (
    <li>
      <button onClick={onClick} disabled={!i.holdId}
        className={`w-full rounded-md border-l-4 px-2.5 py-1.5 text-left text-sm ${fail ? 'border-red-500 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-900'} ${i.holdId ? 'hover:brightness-95' : 'cursor-default'}`}>
        {i.text}{i.holdId && <span className="ml-1 text-xs opacity-70">Show →</span>}
      </button>
    </li>
  )
}

function StatusBadge({ fails, warns, empty }: { fails: number; warns: number; empty: boolean }) {
  if (empty) return <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">No cargo</span>
  if (fails) return <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold">Fails {fails}</span>
  if (warns) return <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">Warnings {warns}</span>
  return <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold">Within limits</span>
}
