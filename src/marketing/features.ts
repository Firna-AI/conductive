import type { MacChip } from '../../docs/mockups/src/brand'
import type { MarketingPictureKey } from '../../docs/mockups/src/screens/marketingPictureList'
import type { FeatureIconName } from './icon-shapes'

/**
 * The words of the site that the mockups also show: the lines that sum up
 * the product, and the features of the home page. The site renders them as
 * HTML, and the mockups render them with React in
 * docs/mockups/src/screens/MarketingScreen.tsx and its parts, so both show
 * the same words, icons, and pictures, in the same order.
 */

/** The lines that sum up the product. Both name the browser and the Mac app. */
export const productSummary = {
  /**
   * The sentence under the headline of the home page. It is also the
   * description of the home page, which a search result can show.
   */
  heroText:
    'Agents powered by Claude and Codex work on their own branch, in a full clone of your repository. You follow along and review the work from any browser or from the Mac app.',
  /** The line under the lockup in the footer of each page. */
  tagline: 'Coding agents on cloud computers, in your browser or the Mac app.',
} as const

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

/** A download of the Mac app: the chip of its DMG, and its button. */
type MacDownload = {
  readonly chip: MacChip
  readonly label: string
}

/**
 * A feature with the downloads of the Mac app, and the oldest macOS version
 * that the app runs on.
 */
export type MacAppSection = Feature & {
  /** The downloads in their order. The first one is the main action. */
  readonly downloads: readonly MacDownload[]
  /** The oldest macOS version that the app runs on, as one sentence. */
  readonly requirement: string
}

/**
 * The section of the Mac app, after the features. It is not an entry of
 * `features`, because the site draws each entry of `features` as a feature
 * without downloads. Each claim is one that the plan decides.
 */
export const macAppSection: MacAppSection = {
  label: 'Mac app',
  title: 'Work from the Mac app.',
  text: 'The app opens in its own window, and agents keep working in the cloud. An agent can ask to run a command on your Mac, and the command runs only after you allow it.',
  picture: 'mac',
  downloads: [
    { chip: 'arm64', label: 'Download for Mac (Apple silicon)' },
    { chip: 'x64', label: 'Download for Mac (Intel)' },
  ],
  requirement: 'Runs on macOS 13 or later.',
}

/**
 * A smaller feature: an icon, a short title, and one sentence. The icon is
 * the name of a lucide icon, which each surface draws in its own way.
 */
export type FeatureItem = {
  readonly icon: FeatureIconName
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
    text: 'Archive a workspace at once. Restore it within 14 days.',
  },
]
