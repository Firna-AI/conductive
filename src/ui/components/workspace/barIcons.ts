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
 * The icon of each agent action of the pull request bar. This module
 * imports no fixture, so the app takes the icons from here too.
 */
export const agentIcons: Readonly<Record<AgentAction, LucideIcon>> = {
  'create-pull-request': GitPullRequestCreateArrow,
  'commit-and-push': Upload,
  push: Upload,
  'fix-checks': Wrench,
  'resolve-conflicts': GitCompareArrows,
  'address-review': MessageSquareCode,
}
