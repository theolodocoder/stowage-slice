import { CARGOES, VESSEL, fmt, type CargoId, type Condition, type Plan } from './vessel'

const X0 = 40
const W = 900
const KEEL = 222
const K = 8 // px per metre vertically
export const px = (x: number) => X0 + (x / VESSEL.lbp) * W
const py = (m: number) => KEEL - m * K
const DECK = py(VESSEL.depth)

interface Props {
  plan: Plan
  c: Condition
  selected: number | null
  failing: Set<number>
  onSelect: (id: number) => void
  onDrop: (id: number, cargo: CargoId) => void
}

export function ShipProfile({ plan, c, selected, failing, onSelect, onDrop }: Props) {
  const yAft = py(c.draftAft)
  const yFwd = py(c.draftFwd)
  return (
    <svg viewBox="0 0 1000 250" className="w-full" role="img" aria-label={`Side profile. Drafts: forward ${c.draftFwd} m, aft ${c.draftAft} m.`}>
      {/* sea */}
      <polygon points={`0,${yAft} 1000,${yFwd} 1000,250 0,250`} fill="#0ea5e9" opacity="0.08" />
      {/* superstructure */}
      <g fill="#e2e8f0" stroke="#94a3b8">
        <rect x={px(4)} y={DECK - 46} width={px(30) - px(4)} height={46} rx="2" />
        <rect x={px(8)} y={DECK - 58} width={px(26) - px(8)} height={12} rx="2" />
      </g>
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4].map((i) => (
          <rect key={`${r}-${i}`} x={px(6) + i * 21} y={DECK - 40 + r * 13} width="12" height="6" fill="#94a3b8" />
        )),
      )}
      {/* hull */}
      <path
        d={`M ${px(-3)} ${DECK} L ${px(178)} ${DECK} L ${px(196)} ${DECK - 8} Q ${px(194)} ${KEEL - 60} ${px(186)} ${KEEL} L ${px(10)} ${KEEL} Q ${px(-2)} ${KEEL - 20} ${px(-3)} ${DECK + 40} Z`}
        fill="#f8fafc"
        stroke="#334155"
        strokeWidth="2"
      />
      {/* engine room */}
      <rect x={px(0)} y={DECK + 4} width={px(40) - px(0)} height={KEEL - DECK - 8} fill="#f1f5f9" stroke="#cbd5e1" />
      <text x={(px(0) + px(40)) / 2} y={KEEL - 14} textAnchor="middle" className="fill-slate-400 text-[11px]">Engine room</text>
      {/* double bottom */}
      <rect x={px(40)} y={py(VESSEL.doubleBottom)} width={px(174) - px(40)} height={VESSEL.doubleBottom * K} fill="#e0f2fe" stroke="#bae6fd" />

      {VESSEL.holds.map((h) => {
        const use = c.holdUse[h.id]
        const p = plan[h.id]
        const top = DECK + 4
        const bottom = py(VESSEL.doubleBottom)
        const fillH = Math.min(bottom - top, (use.heightM / VESSEL.holdHeight) * (bottom - top))
        const isSel = selected === h.id
        const isBad = failing.has(h.id)
        return (
          <g
            key={h.id}
            role="button"
            tabIndex={0}
            aria-label={`Hold ${h.id}: ${fmt(use.tonnes)} tonnes${p ? ` of ${CARGOES[p.cargo].name}` : ''}`}
            className="cursor-pointer focus:outline-none"
            onClick={() => onSelect(h.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(h.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onDrop(h.id, e.dataTransfer.getData('text/plain') as CargoId) }}
          >
            {/* hatch cover */}
            <rect x={px(h.aft + 4)} y={DECK - 7} width={px(h.fwd - 4) - px(h.aft + 4)} height={7} fill="#cbd5e1" stroke="#64748b" />
            <rect x={px(h.aft) + 2} y={top} width={px(h.fwd) - px(h.aft) - 4} height={bottom - top} fill={isSel ? '#e0f2fe' : '#ffffff'} stroke={isBad ? '#dc2626' : isSel ? '#0284c7' : '#94a3b8'} strokeWidth={isBad || isSel ? 3 : 1.5} />
            {p && <rect x={px(h.aft) + 4} y={bottom - fillH} width={px(h.fwd) - px(h.aft) - 8} height={fillH} fill={CARGOES[p.cargo].fill} opacity="0.9" />}
            <text x={(px(h.aft) + px(h.fwd)) / 2} y={top + 18} textAnchor="middle" className="fill-slate-800 text-[13px] font-semibold" stroke="#fff" strokeWidth="3" paintOrder="stroke">H{h.id}</text>
            <text x={(px(h.aft) + px(h.fwd)) / 2} y={top + 34} textAnchor="middle" className="fill-slate-700 text-[11px] font-medium" stroke="#fff" strokeWidth="3" paintOrder="stroke">{use.tonnes ? `${fmt(use.tonnes)} t` : 'empty'}</text>
          </g>
        )
      })}

      {/* waterline + draft marks */}
      <line x1="0" y1={yAft} x2="1000" y2={yFwd} stroke="#0284c7" strokeWidth="2" strokeDasharray="6 4" />
      <text x={px(-3) - 2} y={yAft - 6} textAnchor="start" className="fill-sky-700 text-[12px] font-semibold">A {c.draftAft} m</text>
      <text x="996" y={yFwd - 6} textAnchor="end" className="fill-sky-700 text-[12px] font-semibold">F {c.draftFwd} m</text>
      <line x1="0" y1={py(VESSEL.summerDraft)} x2="1000" y2={py(VESSEL.summerDraft)} stroke="#dc2626" strokeWidth="1" opacity="0.5" />
      <text x={px(100)} y={py(VESSEL.summerDraft) - 4} textAnchor="middle" className="fill-red-600 text-[10px]">Summer load line {VESSEL.summerDraft} m</text>
    </svg>
  )
}
