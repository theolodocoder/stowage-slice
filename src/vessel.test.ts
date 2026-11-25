import { describe, expect, it } from 'vitest'
import { PRESETS, computeCondition, loadingSequence, remainingCargo } from './vessel'

const ids = (c: ReturnType<typeof computeCondition>, sev?: 'fail' | 'warn') =>
  c.issues.filter((i) => !sev || i.severity === sev).map((i) => i.id)

describe('loading condition checks', () => {
  it('passes the homogeneous coal condition with no warnings', () => {
    const c = computeCondition(PRESETS.homogeneous.plan)
    expect(c.issues).toEqual([])
    expect(c.trim).toBeLessThan(0) // slightly by the stern
    expect(c.maxSf).toBeLessThan(85)
    expect(c.maxBm).toBeLessThan(85)
  })

  it('fails a hold over its mass limit', () => {
    const c = computeCondition({ 2: { cargo: 'iron-ore', tonnes: 19_500 } })
    expect(ids(c, 'fail')).toContain('mass-2')
  })

  it('fails cargo that needs more space than the hold has', () => {
    const c = computeCondition({ 5: { cargo: 'wheat', tonnes: 11_000 } }) // 14,300 m³ > 13,500 m³
    expect(ids(c, 'fail')).toContain('vol-5')
  })

  it('fails the unsafe example on draft, trim and shear force', () => {
    const c = computeCondition(PRESETS.unsafe.plan)
    expect(ids(c, 'fail')).toEqual(expect.arrayContaining(['draft', 'trim', 'sf']))
  })

  it('a port draft limit tightens the draft check and the cargo still loadable', () => {
    const c = computeCondition(PRESETS.homogeneous.plan, 'departure', { portDraft: 11 })
    expect(ids(c, 'fail')).toContain('draft')
    expect(remainingCargo(computeCondition({}), 11)).toBeGreaterThan(0)
  })

  it('arrival burns fuel and water, so displacement drops', () => {
    const dep = computeCondition(PRESETS.homogeneous.plan, 'departure')
    const arr = computeCondition(PRESETS.homogeneous.plan, 'arrival')
    expect(arr.displacement).toBeLessThan(dep.displacement)
  })

  it('checks every loading step and ends with the full plan', () => {
    const seq = loadingSequence(PRESETS.alternate.plan)
    expect(seq).toHaveLength(4)
    expect(seq.at(-1)!.condition.cargo).toBe(47_000)
    expect(seq.slice(0, 3).every((s) => s.condition.issues.every((i) => i.severity !== 'fail'))).toBe(true)
  })

  it('an empty ship has no issues and zero strength load', () => {
    const c = computeCondition({})
    expect(c.issues).toEqual([])
    expect(c.maxSf).toBe(0)
  })
})

describe('undo / redo', () => {
  it('steps plan edits back and forward', async () => {
    const { usePlan } = await import('./store')
    const st = usePlan.getState
    st().clear()
    st().add(3, 'coal')
    st().add(3, 'coal')
    expect(st().plan[3]?.tonnes).toBe(2_000)
    st().undo()
    expect(st().plan[3]?.tonnes).toBe(1_000)
    st().redo()
    expect(st().plan[3]?.tonnes).toBe(2_000)
    st().add(1, 'coal') // a new edit drops the redo branch
    expect(st().future).toEqual([])
  })
})

describe('share links', () => {
  it('round-trips a plan and drops junk from the hash', async () => {
    const { encodeShare, decodeShare } = await import('./store')
    const hash = encodeShare(PRESETS.alternate.plan, 'arrival', 12.5)
    expect(decodeShare('#' + hash)).toEqual({ plan: PRESETS.alternate.plan, condition: 'arrival', portDraft: 12.5 })
    const bad = decodeShare('#plan=9.coal.1000~2.gold.500~3.coal.-4~4.coal.2000&cond=x&draft=99')!
    expect(bad.plan).toEqual({ 4: { cargo: 'coal', tonnes: 2000 } })
    expect(bad.condition).toBe('departure')
    expect(decodeShare('')).toBeNull()
  })
})
