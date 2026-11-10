import commandJournal from './command-journal.sh?raw'
import type { SandboxProvider } from '../sandbox/provider'
import { shellQuote } from './commands'

type CommandOwner =
  | { kind: 'build'; id: string }
  | { kind: 'software-image'; id: string }
  | { kind: 'workspace'; id: string; attempt: string }

type CommandPhase =
  'software' | 'install' | 'fetch' | 'branch' | 'startup' | 'terminal'

const COMMAND_ROOT = '/tmp/conductive-lifecycle'

function commandDirectory(owner: CommandOwner): string {
  const parts = [owner.kind, owner.id]
  if (owner.kind === 'workspace') parts.push(owner.attempt)
  return `${COMMAND_ROOT}/${parts.map(encodeURIComponent).join('/')}`
}

/** The saved job identity and phase are the intent, before a provider start. */
export function lifecycleCommand(
  owner: CommandOwner,
  phase: CommandPhase,
  command: string,
): string {
  const directory = `${commandDirectory(owner)}/${phase}`
  return `bash -c ${shellQuote(commandJournal)} conductive-lifecycle ${shellQuote(directory)} ${shellQuote(command)}`
}

/**
 * Remove every output journal before an image sandbox becomes a saved image:
 * an org image or a software image. Each image sandbox runs one image build.
 */
export async function clearImageCommands(
  provider: SandboxProvider,
  sandboxId: string,
): Promise<void> {
  const result = await provider.runCommand(
    sandboxId,
    `rm -rf -- ${shellQuote(COMMAND_ROOT)}`,
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new Error('Image command cleanup failed')
}
