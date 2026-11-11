import { vi } from 'vitest'
import type { ExternalIO, OperationContext } from './operations.ts'
import { checkSettings } from './settings.ts'
import { previewEnvironment } from './settings.test-support.ts'

export function fakeContext() {
  const environment = {
    ...previewEnvironment(),
    GITHUB_REPOSITORY: 'owner/repository',
    GITHUB_TOKEN: 'fake-github-token',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_RUN_ID: '99',
  }
  const setup = checkSettings(environment)
  if (setup.kind !== 'ready') throw new Error('The fake setup is incomplete.')
  const command = vi.fn<ExternalIO['command']>(async () => {
    throw new Error('Unexpected fake command.')
  })
  const http = vi.fn<ExternalIO['fetch']>(async () => {
    throw new Error('Unexpected fake HTTP request.')
  })
  let time = 0
  const pause = vi.fn(async (milliseconds: number) => {
    time += milliseconds
  })
  const warn = vi.fn<ExternalIO['warn']>()
  const ctx: OperationContext = {
    settings: setup.settings,
    wrangler: '/trusted/node_modules/.bin/wrangler',
    cwd: '/artifact',
    environment,
    io: { command, fetch: http, now: () => time, pause, warn },
  }
  return { ctx, command, http, pause, warn }
}

export function apiReply(result: unknown, resultInfo?: unknown): Response {
  return Response.json({ success: true, result, result_info: resultInfo })
}

export function commandReply(value: unknown) {
  return { exitCode: 0, stdout: JSON.stringify(value), stderr: '' }
}

export function d1Reply(results: unknown[]) {
  return commandReply([{ success: true, results }])
}
