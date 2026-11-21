import type { WorktreeSpaceVariation } from '../../../screens/WorktreeSpaceScreen'

/** The title and the idea of each variation of the draft graphic. */
export const variationNotes: Record<
  WorktreeSpaceVariation,
  { title: string; description: string }
> = {
  rows: {
    title: 'A. Rows',
    description:
      'One stacked bar for each worktree, split into source files, dependencies, and build output, with the size at its end and the shared Git history once at the bottom. With Conductive, the same rows each say that the worktree is on its own cloud computer, and the computer holds 0 GB of worktrees.',
  },
  terminal: {
    title: 'B. Terminal',
    description:
      'Two terminal windows run du -shc on the folder of the worktrees. The first lists six worktrees of 4.9 GB, each with a bar of blocks in the colours of its parts, and a total of 30 GB. With Conductive, the folder does not exist, and a comment says that each agent works on its own cloud computer.',
  },
  blocks: {
    title: 'C. Blocks',
    description:
      'Each square is 0.25 GB, so each worktree is a block of 20 squares, and six agents give six blocks. With Conductive, the same blocks show as outlines on six cloud computers, and the computer holds 0 GB of worktrees.',
  },
  laptop: {
    title: 'D. Laptop',
    description:
      'A drawing of a laptop whose storage bar holds six worktrees, beside a laptop that lists six workspaces, with a line from it to each cloud computer that holds the worktree.',
  },
  growth: {
    title: 'E. Growth',
    description:
      'A line chart of the disk space of the worktrees as agents join, from 1 to 10. On the computer it grows by 4.9 GB with each agent, to 49 GB, with a mark at six agents. With Conductive it stays at 0 GB. Each point has a native tooltip.',
  },
  multiplier: {
    title: 'F. Multiplier',
    description:
      'After concept 2 of GPT-6 Astra: the folders of one worktree with the size of each, 4.9 GB in all, then times six agents, then a pile of six copies that holds 30 GB. A band under it says that with Conductive each workspace keeps these folders on its own cloud computer.',
  },
}

/** Why the page exists, which each variation shares. */
export const variationRationale =
  'Cal asked on 16 November 2026 for a graphic that shows that local worktrees take a lot of disk space, because each one adds its own dependencies, and for several variations. GPT-6 Astra proposed concepts too, in a separate session. Every variation reads the same sizes, measured on one worktree of this repository, and the footnote names that source, so no figure is a guess. Each part keeps a label beside its colour, so no part is told by colour alone. The colours of the parts are the deeper fill tokens, which pass the chart palette checks in both schemes. This page is a draft: the home page does not show the section until the user chooses a variation.'
