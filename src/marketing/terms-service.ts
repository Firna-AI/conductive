import { productName } from '../shared/brand'
import { paragraph, type LegalDocument } from './legal-text'

export const termsServiceSection: LegalDocument['sections'][number] = {
  title: 'The service',
  blocks: [
    paragraph`${productName} is a coding tool in the browser and in the
      Mac app. Each workspace has its own cloud computer, where agents
      powered by Claude and Codex work. A workspace can hold one task
      after another, with one branch at a time.`,
    paragraph`An org admin can choose one public GitHub repository of
      agent skills for every workspace of the org. Agents powered by
      Claude and Codex use its skill folders. Only an org admin changes
      this setting. Other members read it without changing it.
      The cloud computer copies the repository at
      start and checks for new commits every 5 minutes. A changed
      repository applies at the next start or resume of each workspace.`,
    paragraph`Each skills repository starts untrusted. Only an org admin
      can change its trust choice. Other members can read the choice.
      Trust lets Claude run commands automatically while it reads that
      repository's skills, including future updates. The commands have
      the workspace's access to files, available credentials, and tools.`,
    paragraph`With a valid saved repository name and trust off, Claude
      runs no automatic commands from any skill or custom slash command. This
      includes the workspace's own skills and custom slash commands. The
      restriction also applies when the shared repository is private,
      missing, has no skills, or cannot be copied. Agents can still choose
      to run commands through their ordinary shell tool, including commands
      that a skill suggests.`,
    paragraph`The choice concerns Claude only. It does not change Codex's
      behavior. With no valid repository name saved, workspace skills keep
      their usual behavior.`,
    paragraph`Trust covers one repository. Replacing or removing the
      repository clears trust unless an admin explicitly trusts the
      replacement.`,
    paragraph`Each cloud computer takes the saved trust choice at its
      next start or resume. Saving does not change an active turn. A
      running computer can keep its previous trust while the repository
      copy gets new updates. Restart restarts software without refreshing
      these settings. This choice needs updated cloud computer software.
      Automatic software updates bring that support to existing workspaces.`,
    paragraph`This setting loads only skill folders. It loads no hooks,
      MCP servers, agents, rules files, separate custom slash commands, or
      settings from that repository. Trust permits automatic commands
      without forcing them or bypassing other restrictions.`,
    paragraph`${productName} is free until billing starts. Nobody pays
      until they choose a plan.`,
  ],
}
