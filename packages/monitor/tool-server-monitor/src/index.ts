/** Model-facing server monitor status tool. */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { MonitorStatus } from '@deepseek-ai/dsh-server-monitor'
import type {} from '@deepseek-ai/dsh-server-monitor'

export const name = 'tool-server-monitor'
export const inject = ['serverMonitor', 'tools']

/** Register `server_monitor_status` for the current Agent preset. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'server_monitor_status',
    description: 'List the current health status of monitored Linux servers, including host metrics, checks, and active alerts.',
    parameters: {
      serverId: {
        type: 'string',
        description: 'Optional server id. Omit to list every monitored server.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { servers: { type: 'array', items: { type: 'object', additionalProperties: true } } },
      },
      render: (_args, value) => {
        const servers = (value as unknown as { servers: MonitorStatus[] }).servers
        if (servers.length === 0) return [{ type: 'text', text: 'No monitored servers have reported status.' }]
        return [{ type: 'text', text: servers.map(server => {
          const firing = server.alerts.filter(alert => alert.status === 'firing').length
          return `${server.serverName ?? server.serverId}: ${firing > 0 ? `${firing} active alert(s)` : 'healthy'}; ${server.observations.length} observations; received ${server.receivedAt}`
        }).join('\n') }]
      },
    },
    execute: async (args) => {
      const requested = args.serverId as string | undefined
      const servers = await ctx.serverMonitor.list()
        .then(values => values.filter(server => requested === undefined || server.serverId === requested))
        .then(values => values as unknown as Record<string, import('@deepseek-ai/dsh-session').JsonValue>[])
      return { servers }
    },
  }))
}
