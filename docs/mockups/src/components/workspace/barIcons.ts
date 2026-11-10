import type { LucideIcon } from 'lucide-react'
import {
  GitCompareArrows,
  GitPullRequestCreateArrow,
  MessageSquareCode,
  Upload,
  Wrench,
} from 'lucide-react'
import type { AgentAction } from './barCopy'

/**
 * The icon and the tone of each agent action of the pull request bar. This
 * module imports no fixture, so the app takes them from here too.
 */
export const agentIcons: Readonly<Record<AgentAction, LucideIcon>> = {
  'create-pull-request': GitPullRequestCreateArrow,
  'commit-and-push': Upload,
  'fix-checks': Wrench,
  'resolve-conflicts': GitCompareArrows,
  'address-review': MessageSquareCode,
}

/**
 * The tone of each agent action. Create PR takes the outline tone, as
 * Archive does. The user chose this on 10 November 2026. The tint of a
 * tinted bar still fills each action of that bar.
 */
export const agentTones: Readonly<
  Record<AgentAction, 'primary' | 'secondary'>
> = {
  'create-pull-request': 'secondary',
  'commit-and-push': 'primary',
  'fix-checks': 'primary',
  'resolve-conflicts': 'primary',
  'address-review': 'primary',
}
