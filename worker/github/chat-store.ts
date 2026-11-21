import type { WorkspaceChat } from '../chat/backend'
import type { GitHubStatePort, GitHubUpdate } from './contracts'

/** Use the chat store and publisher of the target workspace Durable Object. */
export function createGitHubStatePort(
  chat: WorkspaceChat,
  workspaceId: string,
  scheduleRefresh: GitHubStatePort['scheduleRefresh'],
  display: (event: GitHubUpdate) => Promise<GitHubUpdate> = async (event) =>
    event,
): GitHubStatePort {
  return {
    read: (key) =>
      chat.readWorkspace(workspaceId, (view) => view.github.get(key)),
    run: (authorize, work) =>
      chat.authorizedWorkspaceOperation(workspaceId, authorize, (operation) =>
        work({
          transaction: (action) =>
            operation.change((transaction) =>
              action({
                get: (key) => transaction.github.get(key),
                put: (key, value) => transaction.github.put(key, value),
                emit: async (event) =>
                  transaction.github.emit(await display(event)),
              }),
            ),
          publish: async (envelope) =>
            operation.publish({
              ...envelope,
              event:
                envelope.event.type === 'github.updated'
                  ? await display(envelope.event)
                  : envelope.event,
            }),
        }),
      ),
    scheduleRefresh,
  }
}
