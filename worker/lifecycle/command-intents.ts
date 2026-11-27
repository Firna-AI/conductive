import commandJournal from './command-journal.sh?raw'
import type { SandboxProvider } from '../sandbox/provider'
import { privilegedCommand } from '../terminal/privileged'
import { workspaceDiskLease } from './command-disk-lease'
import { shellQuote } from './commands'

type CommandOwner =
  | { kind: 'build'; id: string }
  | { kind: 'software-image'; id: string }
  | { kind: 'workspace'; id: string; attempt: string }

type CommandPhase =
  'software' | 'install' | 'fetch' | 'branch' | 'startup' | 'terminal'

const IMAGE_COMMAND_ROOT = '/tmp/conductive-lifecycle'
const WORKSPACE_COMMAND_ROOT = '/run/conductive-lifecycle'
const createWorkspaceCommandRoot = privilegedCommand(
  `install -d -m 700 -o "\${SUDO_UID:-$(id -u)}" -g "\${SUDO_GID:-$(id -g)}" ${WORKSPACE_COMMAND_ROOT}`,
)

function commandPath(owner: CommandOwner, phase: CommandPhase): string {
  const parts = [owner.kind, owner.id]
  if (owner.kind === 'workspace') parts.push(owner.attempt)
  return `${parts.map(encodeURIComponent).join('/')}/${phase}`
}

/** The saved job identity and phase are the intent, before a provider start. */
export function lifecycleCommand(
  owner: CommandOwner,
  phase: CommandPhase,
  command: string,
  recoverOnly = false,
): string {
  const workspace = owner.kind === 'workspace'
  const path = commandPath(owner, phase)
  const oldDirectory = `${IMAGE_COMMAND_ROOT}/${path}`
  const directory = workspace
    ? `${WORKSPACE_COMMAND_ROOT}/${path}`
    : oldDirectory
  const ownerFile = shellQuote(`${directory}/owner`)
  const oldOwnerFile = shellQuote(`${oldDirectory}/owner`)
  const existing = recoverOnly
    ? `test -L ${ownerFile}${workspace ? ` || test -L ${oldOwnerFile}` : ''} || exit 125\n`
    : ''
  const journal = [
    'set -eu',
    `workspace_journal_root=${shellQuote(workspace ? WORKSPACE_COMMAND_ROOT : '')}`,
    ...(workspace
      ? [
          `if [ ! -L ${ownerFile} ] && [ -L ${oldOwnerFile} ]; then`,
          `  set -- ${shellQuote(oldDirectory)} "$2"`,
          `elif [ ! -d ${shellQuote(WORKSPACE_COMMAND_ROOT)} ] || [ ! -w ${shellQuote(WORKSPACE_COMMAND_ROOT)} ]; then`,
          `  ${createWorkspaceCommandRoot}`,
          'fi',
          workspaceDiskLease,
        ]
      : []),
    commandJournal,
  ].join('\n')
  return `${existing}bash -c ${shellQuote(journal)} conductive-lifecycle ${shellQuote(directory)} ${shellQuote(command)}`
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
    `rm -rf -- ${shellQuote(IMAGE_COMMAND_ROOT)}`,
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new Error('Image command cleanup failed')
}
