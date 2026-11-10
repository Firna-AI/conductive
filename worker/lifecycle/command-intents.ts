import commandJournal from './command-journal.sh?raw'
import type { SandboxProvider } from '../sandbox/provider'
import { shellQuote } from './commands'

type CommandOwner =
  | { kind: 'build'; id: string }
  | { kind: 'software-image'; id: string }
  | { kind: 'workspace'; id: string; attempt: string }

type CommandPhase =
  'software' | 'install' | 'fetch' | 'branch' | 'startup' | 'terminal'

function commandDirectory(owner: CommandOwner): string {
  const parts = [owner.kind, owner.id]
  if (owner.kind === 'workspace') parts.push(owner.attempt)
  return `/tmp/conductive-lifecycle/${parts.map(encodeURIComponent).join('/')}`
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

/** Remove output journals before the build sandbox can become an org image. */
export async function clearBuildCommands(
  provider: SandboxProvider,
  sandboxId: string,
  buildId: string,
): Promise<void> {
  return clearImageCommands(provider, sandboxId, { kind: 'build', id: buildId })
}

export async function clearImageCommands(
  provider: SandboxProvider,
  sandboxId: string,
  owner: Extract<CommandOwner, { kind: 'build' | 'software-image' }>,
): Promise<void> {
  const result = await provider.runCommand(
    sandboxId,
    `rm -rf -- ${shellQuote(commandDirectory(owner))}`,
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new Error('Image command cleanup failed')
}
