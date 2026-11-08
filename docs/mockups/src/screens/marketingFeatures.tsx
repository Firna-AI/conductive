import type { Viewport } from '@mokly/mokly'
import {
  Archive,
  Cloud,
  ListTree,
  PanelsTopLeft,
  SquarePlus,
  Users,
} from 'lucide-react'
import type { FeatureItem } from '../components/marketing/FeatureGrid'
import type { Feature } from '../components/marketing/FeatureSection'
import { marketingPicture } from './marketingPictures'

/**
 * The features of the home page, each with a real screen of the app. Each
 * claim is one that the plan decides, as the rationale of the entry says.
 */
export function features(viewport: Viewport): Feature[] {
  return [
    {
      key: 'computers',
      label: 'Cloud computers',
      title: 'A cloud computer for every workspace.',
      text: "Each workspace starts from your org's prepared image, so it is ready in seconds and fetches only the new commits. Send the task at once: it waits until the computer is ready.",
      ...marketingPicture('starting', viewport),
    },
    {
      key: 'agents',
      label: 'Agents',
      title: 'Agents powered by Claude and Codex, on your own accounts.',
      text: 'Pick the model and the effort for each message, attach files, and run several sessions side by side in one workspace.',
      ...marketingPicture('agents', viewport),
    },
    {
      key: 'review',
      label: 'Review',
      title: 'Review every change.',
      text: 'Read the diff of each file, preview Markdown and code, and follow the GitHub checks and the pull request until it can merge.',
      ...marketingPicture('review', viewport),
    },
    {
      key: 'tools',
      label: 'Tools',
      title: 'A terminal, port previews, and a live desktop.',
      text: 'Run commands on the cloud computer, open any port in a preview, and watch the agent use a browser on the desktop.',
      ...marketingPicture('tools', viewport),
    },
    {
      key: 'orgs',
      label: 'Orgs',
      title: 'Set up once for the whole org.',
      text: 'Each org keeps its own repositories and settings. One cloud computer image holds them all, built from your install script, with a startup script and encrypted env vars.',
      ...marketingPicture('org', viewport),
    },
    {
      key: 'phone',
      label: 'Phone',
      title: 'Check in from your phone.',
      text: 'The app works in the browser of your phone. See which agents work or are done, open a workspace, and send the next message.',
      ...marketingPicture('phone', viewport),
      bleed: true,
    },
  ]
}

/** The smaller features, in a grid under the large ones. */
export const smallerFeatures: readonly FeatureItem[] = [
  {
    icon: Cloud,
    title: 'Keeps going when you close the tab',
    text: 'The agent works on its cloud computer. The computer stops when no agent works, and resumes with its files and chat when you need it.',
  },
  {
    icon: Users,
    title: 'Invite your team',
    text: 'Invite members by email, and reassign a workspace to another member.',
  },
  {
    icon: ListTree,
    title: 'Sections that you arrange',
    text: 'Group workspaces your way, and drag them from one section to another.',
  },
  {
    icon: SquarePlus,
    title: 'Agents can create workspaces',
    text: 'An agent can start a new workspace for the next task, with its own cloud computer.',
  },
  {
    icon: PanelsTopLeft,
    title: 'Files and diffs as tabs',
    text: 'Open files, diffs, and agent sessions as tabs in one workspace.',
  },
  {
    icon: Archive,
    title: 'Archive without losing work',
    text: 'Archive a finished workspace. The app checks first for work that is not pushed.',
  },
]
