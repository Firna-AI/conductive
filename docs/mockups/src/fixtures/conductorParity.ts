/**
 * The sample data of the page for people who move from Conductor Cloud, at
 * `from-conductor` on the site. It is a small part of the real list: a few
 * Conductor Cloud features of each area, chosen so that every status
 * shows. Each claim holds on `main` on 9 November 2026. The due days are
 * examples for the design study. The team has not chosen them.
 */

/**
 * Where a Conductor Cloud feature stands in Conductive, in the words that a
 * visitor reads.
 */
export type ParityStatus =
  | 'available'
  | 'in-progress'
  | 'planned'
  | 'different'
  | 'considering'
  | 'not-planned'

/** The keys of the areas of the list, in the order of the page. */
export const parityAreaKeys = [
  'workspaces',
  'agents',
  'review',
  'computer',
  'teams',
  'automation',
] as const

export type ParityAreaKey = (typeof parityAreaKeys)[number]

/** An area of the list: its name, the job that it covers, and one sentence. */
export type ParityArea = {
  readonly key: ParityAreaKey
  readonly title: string
  /** The job of the area, which the task layout uses as its heading. */
  readonly task: string
  /** What the area means for a person who moves, in one sentence. */
  readonly summary: string
}

type FeatureBase = {
  /** The name that Conductor gives the feature. */
  readonly name: string
  readonly area: ParityAreaKey
  /** What Conductive does, or what to do instead, in one sentence. */
  readonly note: string
}

/**
 * A feature that is on the way. It has a due day, as `YYYY-MM-DD`, only
 * when the team commits to one.
 */
export type ComingFeature = FeatureBase & {
  readonly status: 'in-progress' | 'planned'
  readonly due: string | null
}

/** A feature that is not on the way, so it has no due day. */
type SettledFeature = FeatureBase & {
  readonly status: Exclude<ParityStatus, ComingFeature['status']>
}

export type ParityFeature = ComingFeature | SettledFeature

/** The days of Conductor Cloud that the page names, from its release 0.93.0. */
export const conductorCloudDays = {
  readOnly: '2026-11-13',
  shutDown: '2026-11-20',
} as const

/** The day of the last check of the list against the product. */
export const parityCheckedOn = '2026-11-09'

/**
 * The limits of this sample, which each catalogue entry of the page states
 * outside the screen.
 */
export const parityStudyNote =
  'The screen shows a sample of 24 Conductor Cloud features in six areas, not the full list. Its counts come from that sample. The due days of Attachments, 16 November 2026, and of Start from a branch or pull request, 30 November 2026, are examples for the design study, not delivery dates that the team chose. The page leaves out the features of local Conductor workspaces, as the user chose.'

export const parityAreas: readonly ParityArea[] = [
  {
    key: 'workspaces',
    title: 'Workspaces',
    task: 'Start a task',
    summary: 'Each task still gets its own branch and its own cloud computer.',
  },
  {
    key: 'agents',
    title: 'Agents and chat',
    task: 'Work with agents',
    summary:
      'Agents powered by Claude and Codex work in the chat, and you can steer them while they work.',
  },
  {
    key: 'review',
    title: 'Review and merge',
    task: 'Review and merge',
    summary:
      'Read the diff and follow the checks in the app, then merge on GitHub.',
  },
  {
    key: 'computer',
    title: 'Cloud computer',
    task: 'Set up the cloud computer',
    summary:
      'One image for the org, and a cloud computer for each workspace that stops when it is idle.',
  },
  {
    key: 'teams',
    title: 'Teams',
    task: 'Work as a team',
    summary:
      'Every member of an org sees each workspace and can continue the work.',
  },
  {
    key: 'automation',
    title: 'Automation and apps',
    task: 'Automate and check in',
    summary:
      'Routines are planned, and the app works in the browser of your phone.',
  },
]

export const parityFeatures: readonly ParityFeature[] = [
  {
    name: 'Isolated workspaces',
    area: 'workspaces',
    status: 'available',
    note: 'Each workspace gets its own branch and its own cloud computer, with its own clone of the repository.',
  },
  {
    name: 'Archive',
    area: 'workspaces',
    status: 'available',
    note: 'Archive deletes the cloud computer and keeps the chat. It first checks for work that is not pushed.',
  },
  {
    name: 'Start from a branch or pull request',
    area: 'workspaces',
    status: 'planned',
    due: '2026-11-30',
    note: 'Continue a branch or an open pull request that is already on GitHub.',
  },
  {
    name: 'Rename a workspace',
    area: 'workspaces',
    status: 'considering',
    note: 'A workspace takes its name from its first message. You can rename each session from its tab.',
  },
  {
    name: 'Agent chat',
    area: 'agents',
    status: 'available',
    note: 'Chat with agents powered by Claude and Codex, with several sessions as tabs in one workspace.',
  },
  {
    name: 'Steering',
    area: 'agents',
    status: 'available',
    note: 'A message that you send during a turn joins it, and the agent reads it as it works.',
  },
  {
    name: 'Attachments',
    area: 'agents',
    status: 'in-progress',
    due: '2026-11-16',
    note: 'Attach files of up to 25 MB each to a message.',
  },
  {
    name: 'Message queue',
    area: 'agents',
    status: 'not-planned',
    note: 'Send the next step after the turn ends, or send it now to steer the turn.',
  },
  {
    name: 'Plan mode',
    area: 'agents',
    status: 'considering',
    note: 'Ask the agent for a plan in your message before it starts work.',
  },
  {
    name: 'Diff viewer',
    area: 'review',
    status: 'available',
    note: 'Each changed file opens as a diff against the default branch.',
  },
  {
    name: 'Checks tab',
    area: 'review',
    status: 'available',
    note: 'The Checks tab lists each GitHub check with its state and how long it ran.',
  },
  {
    name: 'Merge from the app',
    area: 'review',
    status: 'different',
    note: 'When the pull request is ready, the bar opens it on GitHub, where you merge it.',
  },
  {
    name: 'Fix failing checks',
    area: 'review',
    status: 'not-planned',
    note: 'The Checks tab shows which check failed. Ask the agent in a message to fix it.',
  },
  {
    name: 'Diff comments',
    area: 'review',
    status: 'considering',
    note: 'Name the file and the line in your message to the agent.',
  },
  {
    name: 'Cloud Computer',
    area: 'computer',
    status: 'available',
    note: 'An install script builds one image for the org, with each repository that the org uses.',
  },
  {
    name: 'Sleep and wake',
    area: 'computer',
    status: 'available',
    note: 'A cloud computer stops after 30 minutes without activity. Open the workspace to resume it.',
  },
  {
    name: 'Cloud setup scripts',
    area: 'computer',
    status: 'different',
    note: 'One startup script for the org runs at each start, in place of a script for each repository.',
  },
  {
    name: 'Port forwarding',
    area: 'computer',
    status: 'different',
    note: 'Type a port to open it as a preview in the app, in place of a port on your Mac.',
  },
  {
    name: 'Sync to a local directory',
    area: 'computer',
    status: 'planned',
    due: null,
    note: 'A one-way copy of a workspace in a folder on your Mac, from the Mac app.',
  },
  {
    name: 'Open via SSH',
    area: 'computer',
    status: 'considering',
    note: 'Use the terminal in the app. It runs in the cloud computer of the workspace.',
  },
  {
    name: 'Organizations',
    area: 'teams',
    status: 'available',
    note: 'Create an org, invite teammates by email, and switch between your orgs.',
  },
  {
    name: 'Shared workspaces',
    area: 'teams',
    status: 'available',
    note: 'Every member of an org sees all of its workspaces and can send messages in each.',
  },
  {
    name: 'Routines',
    area: 'automation',
    status: 'planned',
    due: null,
    note: 'Run a saved prompt on a schedule or on a pull request event, in a new workspace each time.',
  },
  {
    name: 'iOS app',
    area: 'automation',
    status: 'different',
    note: 'Open the app in the browser of your phone. It shows the chat, the files, the terminal, and previews.',
  },
]
