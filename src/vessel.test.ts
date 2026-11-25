import { describe, expect, it } from 'vitest'
import { computeCondition } from './vessel'

describe('loading condition checks', () => {
  it('passes an evenly spread iron ore plan', () => {
    const c = computeCondition({
      1: [{ cargo: 'iron-ore', tonnes: 8000 }],
      2: [{ cargo: 'iron-ore', tonnes: 11000 }],
      3: [{ cargo: 'iron-ore', tonnes: 11000 }],
      4: [{ cargo: 'iron-ore', tonnes: 11000 }],
      5: [{ cargo: 'iron-ore', tonnes: 9000 }],
    })
    expect(c.problems).toEqual([])
    expect(c.displacement).toBe(61000)
  })

  it('blocks a hold over its tank-top limit', () => {
    const c = computeCondition({ 3: [{ cargo: 'iron-ore', tonnes: 15000 }] })
    expect(c.problems.some((p) => p.startsWith('Hold 3:') && p.includes('tank-top'))).toBe(true)
  })

  it('blocks two cargoes in one hold', () => {
    const c = computeCondition({ 2: [{ cargo: 'grain', tonnes: 2000 }, { cargo: 'coal', tonnes: 1000 }] })
    expect(c.problems).toContain('Hold 2: one cargo per hold (it has 2).')
  })

  it('blocks cargo that needs more space than the hold has', () => {
    const c = computeCondition({ 1: [{ cargo: 'grain', tonnes: 9000 }] }) // 9000 × 1.4 = 12,600 m³ > 11,000
    expect(c.problems.some((p) => p.includes('m³'))).toBe(true)
  })

  it('flags trim when all the weight is forward', () => {
    const c = computeCondition({ 1: [{ cargo: 'iron-ore', tonnes: 10000 }], 2: [{ cargo: 'iron-ore', tonnes: 13000 }] })
    expect(c.trim).toBeGreaterThan(0)
    expect(c.problems.some((p) => p.startsWith('Trim'))).toBe(true)
  })

  it('an empty plan has no problems and zero stress', () => {
    const c = computeCondition({})
    expect(c.problems).toEqual([])
    expect(c.stress).toBe(0)
  })
})
