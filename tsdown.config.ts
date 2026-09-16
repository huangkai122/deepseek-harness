import { defineConfig } from 'tsdown'
import { typertPlugin } from './packages/typert/generator/lib/types/tsdown-plugin.js'

function isBuildFaceClient(value: unknown): boolean {
  if (value === undefined || value === 'host') return false
  if (value === 'client') return true
  throw new Error(`tsdown: --env.DSH_BUILD_FACE must be host or client, received ${String(value)}`)
}

/**
 * The ordinary workspace build consumes JavaScript emitted by the Host
 * TypeScript project and runs Typert. The Client pass selects packages that
 * declare a browser bundle and lets their package-local configs emit both
 * their Node loader entry and browser artifact.
 */
export default defineConfig(({ env }) => {
  const client = isBuildFaceClient(env?.DSH_BUILD_FACE)
  // These packages are excluded from the matching TypeScript face aggregate and
  // are retained only for installation compatibility.
  const workspaceExcludes = [
    '**/node_modules/**',
    '**/dist/**',
    '**/test?(s)/**',
    '**/t?(e)mp/**',
    ...(client
      ? [
          'packages/client/runtime/**',
          'packages/client/ui-db-settings/**',
          'packages/client/ui-ssl-certificates/**',
          'packages/client/ui-task-management/**',
          'packages/client/ui-user-center/**',
          'packages/extensions/ui-game-center/**',
        ]
      : [
          'packages/client/ui-ssl-certificates/**',
          'packages/host/apiproxy/**',
          'packages/task/task-management/**',
        ]),
  ]
  return {
    workspace: {
      include: client
        ? ['vendor/*', 'packages/*/*', 'apps/cli']
        : ['vendor/*', 'packages/*/*', 'apps/cli', 'apps/desktop', 'apps/desktop-host'],
      exclude: workspaceExcludes,
    },
    // The repository root is a workspace orchestrator, not a runtime package;
    // tsconfig.host.json intentionally emits no root lib/types entries.
    entry: '',
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    plugins: client ? [] : [typertPlugin({ mode: 'workspace', faces: ['host'] })],
  }
})
