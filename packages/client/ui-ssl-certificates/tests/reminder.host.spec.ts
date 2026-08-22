import { describe, expect, it, vi } from 'vitest'
import { check } from '../src/index.ts'

describe('SSL certificate reminder schedule', () => {
  it('sends once at Shanghai 09:00 and records the local notification date', async () => {
    let state = {
      certificates: [{ domain: 'example.com', expiresAt: '2026-08-23T01:00:00.000Z', remark: '测试证书' }],
      notifyDays: 1,
      webhookProvider: 'dingtalk' as const,
      webhookUrl: 'https://webhook.test/dingtalk',
      notificationLog: [] as Array<{ domain: string; date: string }>,
    }
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    const scope = { get: () => state, update: async (patch: object) => { state = { ...state, ...patch } } }
    const nineAmShanghai = new Date('2026-08-22T01:00:00.000Z')
    await check(scope, nineAmShanghai)
    await check(scope, nineAmShanghai)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(state.notificationLog).toEqual([{ domain: 'example.com', date: '2026-08-22' }])
    fetch.mockRestore()
  })
})
