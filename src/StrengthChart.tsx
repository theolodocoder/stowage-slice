import { STATION_X, VESSEL, type Condition } from './vessel'
import { px } from './ShipProfile'

const H = 180
const TOP = 16
const MAXP = 140
const py = (pct: number) => TOP + (1 - Math.min(pct, MAXP) / MAXP) * (H - TOP - 20)

export function StrengthChart({ c, selected }: { c: Condition; selected: number | null }) {
  const line = (arr: number[]) => arr.map((v, i) => `${px(STATION_X[i]).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 1000 ${H}`} className="w-full" role="img" aria-label={`Longitudinal strength. Max shear force ${c.maxSf}%, max bending moment ${c.maxBm}% of allowable.`}>
      {VESSEL.holds.map((h) => (
        <rect key={h.id} x={px(h.aft)} y={TOP} width={px(h.fwd) - px(h.aft)} height={H - TOP - 20} fill={selected === h.id ? '#e0f2fe' : h.id % 2 ? '#f8fafc' : '#ffffff'} />
      ))}
      {VESSEL.holds.map((h) => (
        <text key={h.id} x={(px(h.aft) + px(h.fwd)) / 2} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">H{h.id}</text>
      ))}
      {[0, 50, 85, 100].map((p) => (
        <g key={p}>
          <line x1={px(0)} x2={px(VESSEL.lbp)} y1={py(p)} y2={py(p)} stroke={p === 100 ? '#dc2626' : p === 85 ? '#f59e0b' : '#e2e8f0'} strokeDasharray={p >= 85 ? '6 4' : undefined} />
          <text x={px(0) - 6} y={py(p) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{p}%</text>
        </g>
      ))}
      <polyline points={line(c.sf)} fill="none" stroke="#0284c7" strokeWidth="2.5" />
      <polyline points={line(c.bm)} fill="none" stroke="#7c3aed" strokeWidth="2.5" />
      <g className="text-[11px]">
        <circle cx={px(150)} cy={TOP - 6} r="4" fill="#0284c7" />
        <text x={px(150) + 8} y={TOP - 2} className="fill-slate-600">Shear force {c.maxSf}%</text>
        <circle cx={px(176)} cy={TOP - 6} r="4" fill="#7c3aed" />
        <text x={px(176) + 8} y={TOP - 2} className="fill-slate-600">Bending {c.maxBm}%</text>
      </g>
    </svg>
  )
}
