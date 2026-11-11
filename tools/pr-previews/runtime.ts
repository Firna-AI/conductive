import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import type {
  CommandReply,
  CommandRequest,
  ExternalIO,
  OperationContext,
} from './operations.ts'

function command(request: CommandRequest): Promise<CommandReply> {
  const environment = { ...process.env }
  for (const key of Object.keys(environment)) delete environment[key]
  Object.assign(environment, request.env)
  return new Promise((resolve) => {
    const child = spawn(request.executable, request.args, {
      cwd: request.cwd,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk
    })
    child.once('error', () => resolve({ exitCode: 1, stdout: '', stderr: '' }))
    child.once('close', (code) =>
      resolve({ exitCode: code ?? 1, stdout, stderr }),
    )
  })
}

export function defaultIO(): ExternalIO {
  return {
    command,
    fetch: (request) => fetch(request),
    now: Date.now,
    pause: async (milliseconds) => {
      await delay(milliseconds)
    },
    warn: (message) => console.warn(message),
  }
}

export function commandEnvironment(
  ctx: OperationContext,
): Record<string, string> {
  const environment: Record<string, string> = {
    CI: 'true',
    WRANGLER_SEND_METRICS: 'false',
  }
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'RUNNER_TEMP', 'SystemRoot']) {
    const value = ctx.environment[key]
    if (value !== undefined) environment[key] = value
  }
  return environment
}

export async function runWrangler(
  ctx: OperationContext,
  args: string[],
): Promise<string> {
  let reply: CommandReply
  try {
    reply = await ctx.io.command({
      executable: ctx.wrangler,
      args,
      cwd: ctx.cwd,
      env: {
        ...commandEnvironment(ctx),
        CLOUDFLARE_ACCOUNT_ID: ctx.settings.accountId,
        CLOUDFLARE_API_TOKEN: ctx.settings.apiToken,
      },
    })
  } catch {
    throw new Error('Wrangler command could not start.')
  }
  if (reply.exitCode !== 0)
    throw new Error(
      `Wrangler ${args[0] === 'd1' ? args.slice(0, 2).join(' ') : args[0]} failed with exit code ${reply.exitCode}.`,
    )
  return reply.stdout
}
