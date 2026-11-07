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
    run: (authorize, work) =>
      chat.authorizedWorkspaceOperation(workspaceId, authorize, (operation) =>
        work({
          transaction: (action) =>
            operation.change((transaction) => action(transaction.github)),
          publish: async (envelope) => operation.publish(envelope),
        }),
      ),
    scheduleRefresh,
  }
}
