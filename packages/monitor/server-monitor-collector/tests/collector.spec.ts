import { describe, expect, it } from 'vitest'
import { collect } from '../src/index.ts'

describe('server monitor collector', () => {
  it('returns observations with stable keys even when a host source is unavailable', async () => {
    const observations = await collect({ now: new Date('2026-01-01T00:00:00.000Z') })
    expect(observations.length).toBeGreaterThan(0)
    expect(observations.every(observation => observation.observedAt === '2026-01-01T00:00:00.000Z')).toBe(true)
    expect(observations.some(observation => observation.key === 'host.metrics' || observation.key === 'host.cpu.percent')).toBe(true)
  })
})
