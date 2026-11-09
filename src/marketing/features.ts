import type { MarketingPictureKey } from '../../docs/mockups/src/screens/marketingPictureList'
import type { IconName } from './icon-shapes'

/**
 * The words of the features of the home page. The site renders them as HTML,
 * and the mockups render them with React in
 * docs/mockups/src/screens/MarketingScreen.tsx, so both show the same
 * words, icons, and pictures, in the same order.
 */

/** One feature of the app: what it does, and a real screen that shows it. */
export type Feature = {
  readonly label: string
  readonly title: string
  readonly text: string
  readonly picture: MarketingPictureKey
  /** The picture runs off the bottom of its stage, as a tall phone does. */
  readonly bleed?: boolean
}

/**
 * The features of the home page, in their order. Each claim is one that the
 * plan decides.
 */
export const features: readonly Feature[] = [
  {
    label: 'Cloud computers',
    title: 'A cloud computer for every workspace.',
    text: "Each workspace starts from your org's prepared image, so it is ready in seconds and fetches only the new commits. Send the task at once: it waits until the computer is ready.",
    picture: 'starting',
  },
  {
    label: 'Agents',
    title: 'Agents powered by Claude and Codex, on your own accounts.',
    text: 'Pick the model and the effort for each message, attach files, and run several sessions side by side in one workspace.',
    picture: 'agents',
  },
  {
    label: 'Review',
    title: 'Review every change.',
    text: 'Read the diff of each file, preview Markdown and code, and follow the GitHub checks and the pull request until it can merge.',
    picture: 'review',
  },
  {
    label: 'Tools',
    title: 'A terminal and port previews.',
    text: 'Run commands on the cloud computer, and open any port in a preview.',
    picture: 'tools',
  },
  {
    label: 'Orgs',
    title: 'Set up once for the whole org.',
    text: 'Each org keeps its own repositories and settings. One cloud computer image holds them all, built from your install script, with a startup script and encrypted env vars.',
    picture: 'org',
  },
  {
    label: 'Phone',
    title: 'Check in from your phone.',
    text: 'The app works in the browser of your phone. See which agents work or are done, open a workspace, and send the next message.',
    picture: 'phone',
    bleed: true,
  },
]

/**
 * A smaller feature: an icon, a short title, and one sentence. The icon is
 * the name of a lucide icon, which each surface draws in its own way.
 */
export type FeatureItem = {
  readonly icon: IconName
  readonly title: string
  readonly text: string
}

/** The smaller features, in a grid under the large ones. */
export const smallerFeatures: readonly FeatureItem[] = [
  {
    icon: 'cloud',
    title: 'Keeps going when you close the tab',
    text: 'The agent works on its cloud computer. The computer stops when no agent works, and resumes with its files and chat when you need it.',
  },
  {
    icon: 'users',
    title: 'Invite your team',
    text: 'Invite members by email, and reassign a workspace to another member.',
  },
  {
    icon: 'list-tree',
    title: 'Sections that you arrange',
    text: 'Group workspaces your way, and drag them from one section to another.',
  },
  {
    icon: 'square-plus',
    title: 'Agents can create workspaces',
    text: 'An agent can start a new workspace for the next task, with its own cloud computer.',
  },
  {
    icon: 'panels-top-left',
    title: 'Files and diffs as tabs',
    text: 'Open files, diffs, and agent sessions as tabs in one workspace.',
  },
  {
    icon: 'archive',
    title: 'Archive without losing work',
    text: 'Archive a finished workspace. The app checks first for work that is not pushed.',
  },
]
