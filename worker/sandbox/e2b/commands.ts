import { isRecord } from '../../http'
import { ProviderError } from '../errors'
import type {
  CommandOffsets,
  CommandResult,
  CommandStatus,
  StartedCommand,
} from '../provider'
import supervisorSource from './command-supervisor.py?raw'
import { ResponseBudget, responseOverflow } from './budgets'
import { commandStatus } from './command-status'
import { enforceCommandJson } from './command-json'
import type { E2bContext } from './context'
import type { EnvdUser } from './envd-routes'
import { envdSession, EnvdSession } from './envd'
import { invalidResponse } from './errors'
import { pythonProcess } from './process'

async function start(
  session: EnvdSession,
  command: string,
  budget: ResponseBudget,
  timeoutSeconds: number,
  user: EnvdUser,
  wait: boolean,
): Promise<number> {
  let pid = 0
  let processId = 0
  let ready = ''
  const decoder = new TextDecoder()
  for await (const current of pythonProcess(
    session,
    supervisorSource,
    { kind: 'command', command, user, timeoutSeconds },
    budget,
    timeoutSeconds,
  )) {
    if (current.kind === 'start') pid = current.pid
    if (current.kind === 'data') {
      if (current.stream === 'stderr')
        throw new ProviderError('unavailable', 503)
      ready += decoder.decode(current.bytes, { stream: true })
      if (!ready.includes('\n')) continue
      let value: unknown
      try {
        value = JSON.parse(ready)
      } catch {
        return invalidResponse()
      }
      if (
        !isRecord(value) ||
        value.pid !== pid ||
        typeof value.processId !== 'number' ||
        !Number.isSafeInteger(value.processId) ||
        value.processId < 1
      )
        return invalidResponse()
      processId = value.processId
      if (!wait) return processId
    }
    if (current.kind === 'end' && (!current.exited || current.exitCode !== 0))
      throw new ProviderError('unavailable', 503)
  }
  if (!processId) return invalidResponse()
  return processId
}

export async function runSupervised(
  context: E2bContext,
  sandboxId: string,
  command: string,
  timeoutSeconds = 600,
  user: EnvdUser = 'user',
): Promise<CommandResult> {
  const session = await envdSession(context, sandboxId)
  const budget = new ResponseBudget('command')
  const processId = await start(
    session,
    command,
    budget,
    timeoutSeconds,
    user,
    true,
  )
  const result = await commandStatus(
    session,
    processId,
    { stdoutOffset: 0, stderrOffset: 0 },
    budget,
    true,
  )
  if (result.more) return responseOverflow('command')
  if (
    result.state !== 'exited' ||
    result.exitCode === null ||
    typeof result.timedOut !== 'boolean'
  )
    return invalidResponse()
  const output: CommandResult = {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
  }
  enforceCommandJson(output)
  return output
}

export async function startCommand(
  context: E2bContext,
  sandboxId: string,
  command: string,
): Promise<StartedCommand> {
  const session = await envdSession(context, sandboxId)
  return {
    processId: await start(
      session,
      command,
      new ResponseBudget('command'),
      0,
      'user',
      false,
    ),
  }
}

export async function getCommandStatus(
  context: E2bContext,
  sandboxId: string,
  processId: number,
  offsets: CommandOffsets,
): Promise<CommandStatus> {
  return commandStatus(
    await envdSession(context, sandboxId),
    processId,
    offsets,
    new ResponseBudget('command'),
  )
}
