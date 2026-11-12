import type { AgentChoice } from './agents'
import type { ConversationKey } from './conversations'
import { codex } from './workspaces'

/**
 * The agent, the model, and the effort of each chat whose session runs on
 * another agent than the choice of its workspace. A session runs one agent,
 * so the chat names it here, and no state can show the chat with the other
 * agent. The other chats run on the choice of their workspace.
 */
export const sessionChoices: Partial<Record<ConversationKey, AgentChoice>> = {
  'five-skills-in-work': codex,
}
