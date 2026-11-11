import { appendFile } from 'node:fs/promises'
import {
  numberOption,
  operationOptions,
  requiredOption,
} from './command-options.ts'
import type { OperationResult } from './commands.ts'
import { shortCommit } from './commits.ts'
import { eventWork } from './event-work.ts'
import { GitHub } from './github.ts'
import type { ExternalIO } from './operations.ts'
import { checkSettings } from './settings.ts'

export async function runEventCommand(
  args: string[],
  environment: Readonly<Record<string, string | undefined>>,
  io: ExternalIO,
): Promise<OperationResult> {
  const values = operationOptions('event', args)
  const number = numberOption(values.pr)
  const sha = requiredOption(values.sha, 'sha')
  shortCommit(sha)
  const intent = requiredOption(values.action, 'action')
  if (!['opened', 'synchronize', 'reopened', 'closed'].includes(intent))
    throw new Error(
      '--action must be opened, synchronize, reopened, or closed.',
    )
  const pull = await new GitHub(environment, io).pullRequest(number)
  const action =
    intent === 'closed'
      ? pull?.state === 'closed'
        ? 'delete'
        : 'stale'
      : pull?.state === 'open' && pull.headSha === sha
        ? 'deploy'
        : 'stale'
  if (environment.GITHUB_OUTPUT)
    await appendFile(
      environment.GITHUB_OUTPUT,
      `event_action=${action}\n`,
      'utf8',
    )
  if (action === 'stale')
    return {
      kind: 'skip',
      warning: `::notice::Preview run for PR ${number} is stale. No changes made.`,
    }
  if (values.check)
    return { kind: 'complete', lines: [`Preview event: ${action}.`] }
  const setup = checkSettings(environment)
  if (environment.GITHUB_OUTPUT)
    await appendFile(environment.GITHUB_OUTPUT, `setup=${setup.kind}\n`, 'utf8')
  if (setup.kind === 'skip') return setup
  if (setup.kind === 'error') throw new Error(setup.message)
  return eventWork(action, values, setup.settings, environment, io)
}
