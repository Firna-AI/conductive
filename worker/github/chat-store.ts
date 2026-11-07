import type { WorkspaceChat } from '../chat/backend'
import type { GitHubStatePort } from './contracts'

/** Use the chat store and publisher of the target workspace Durable Object. */
export function createGitHubStatePort(
  chat: WorkspaceChat,
  workspaceId: string,
  scheduleRefresh: GitHubStatePort['scheduleRefresh'],
): GitHubStatePort {
  return {
    read: (key) =>
      chat.readWorkspace(workspaceId, (view) => view.github.get(key)),
    transaction: (action) =>
      chat.changeWorkspace(workspaceId, (transaction) =>
        action(transaction.github),
      ),
    publish: (envelope) => chat.republishWorkspaceEvent(envelope),
    scheduleRefresh,
  }
}
