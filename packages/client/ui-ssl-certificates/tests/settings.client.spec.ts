import { describe, expect, it } from 'vitest'
import { remainingDays, statusOf } from '../src/types.ts'

describe('SSL certificate expiry rules', () => {
  const now = new Date('2026-01-10T00:00:00.000Z')
  it('calculates remaining whole days toward the next expiry', () => {
    expect(remainingDays('2026-01-11T00:00:00.000Z', now)).toBe(1)
    expect(remainingDays('2026-01-09T23:59:59.000Z', now)).toBe(0)
    expect(remainingDays('2026-08-24T14:53:00.000Z', new Date('2026-08-23T08:50:00.000Z'))).toBe(1)
  })
  it('assigns normal, warning, and danger states', () => {
    expect(statusOf(4)).toBe('normal')
    expect(statusOf(3)).toBe('warning')
    expect(statusOf(2)).toBe('warning')
    expect(statusOf(1)).toBe('danger')
    expect(statusOf(-1)).toBe('danger')
  })
})
