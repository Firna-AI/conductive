/**
 * The words and the sizes of the draft section of the home page that shows
 * why local worktrees fill a disk. Every variation of the graphic reads
 * this one record, so they all show the same claim and the same numbers.
 */

/** One part of a worktree, which each worktree holds a copy of. */
export type WorktreePart = {
  readonly key: 'source' | 'dependencies' | 'build'
  readonly label: string
  /** The folder that holds the part, such as `node_modules`. */
  readonly folder: string
  /** The size of the part in one worktree, in GB. */
  readonly gb: number
}

/**
 * The parts of one worktree of the Conductive repository, measured on a
 * Linux cloud computer on 16 November 2026, in decimal GB as macOS shows
 * them: the files that Git checks out,
 * the three `node_modules` folders after `npm ci`, and the Rust `target`
 * folder after `cargo test --workspace --no-run`.
 */
export const worktreeParts: readonly WorktreePart[] = [
  { key: 'source', label: 'Source files', folder: 'src', gb: 0.03 },
  {
    key: 'dependencies',
    label: 'Dependencies',
    folder: 'node_modules',
    gb: 0.88,
  },
  { key: 'build', label: 'Build output', folder: 'target', gb: 4 },
]

/**
 * The Git history, which every worktree of a clone shares. It counts once,
 * however many worktrees there are.
 */
export const sharedHistory = { label: 'Git history', folder: '.git', gb: 0.07 }

/** The size of one worktree, in GB. */
export const worktreeGb = worktreeParts.reduce((sum, part) => sum + part.gb, 0)

/** The number of agents that the graphic runs side by side. */
export const parallelAgents = 6

/** The size of the worktrees of every agent, with the shared history. */
export const totalGb = worktreeGb * parallelAgents + sharedHistory.gb

/** The words of the section. */
export const worktreeSpaceCopy = {
  label: 'Disk space',
  title: 'Run agents side by side. Keep your disk free.',
  text: 'On your own computer, each agent needs its own worktree, and each worktree installs its own dependencies and builds its own output. In Conductive, each workspace keeps them on its own cloud computer.',
  local: 'On your computer',
  cloud: 'With Conductive',
  footnote:
    'Sizes of one worktree of the Conductive repository, after npm ci and a Rust test build. Your repository can differ.',
} as const

/** A size in GB as short text, such as "5.2 GB" or "40 MB". */
export function formatSize(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1000)} MB`
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`
}

/** The worktree names of the agents, such as `agent-1`. */
export function agentNames(count = parallelAgents): string[] {
  return Array.from({ length: count }, (_, index) => `agent-${index + 1}`)
}
