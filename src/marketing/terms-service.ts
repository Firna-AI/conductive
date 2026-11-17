import { productName } from '../../docs/mockups/src/brand'
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
    paragraph`This setting loads only skill folders. It loads no hooks,
      MCP servers, agents, rules files, commands, or settings from that repository.`,
    paragraph`${productName} is free until billing starts. Nobody pays
      until they choose a plan.`,
  ],
}
