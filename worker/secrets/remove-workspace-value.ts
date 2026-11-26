import type { MessageSender } from '../../src/shared/generated/MessageSender'
import { authorizeChatBrowser } from '../chat/browser-authorization'
import { pruneSavedOutputSecrets } from '../chat/output-filter-records'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { agentOutputSecrets, storedAgentOutputSecrets } from './output-values'
import {
  captureSecretCapabilities,
  secretCapabilitiesChanged,
} from './capability-changes'
import type { SecretRuntime } from './runtime'

export function removeWorkspaceValue(
  runtime: SecretRuntime,
  request: Request,
  workspace: { id: string; orgId: string },
  valueId: string,
  member: MessageSender,
) {
  return runtime.chat.authorizedWorkspaceOperation(
    workspace.id,
    async () => {
      await authorizeChatBrowser(request, runtime.env, runtime.now(), {})
    },
    async (operation) => {
      const beforeFacts = await captureSecretCapabilities(runtime, workspace.id)
      const name = await operation.change(async (view) => {
        const name = await view.secrets.workspaceValueName(valueId)
        const running = await runningOutputSecrets(runtime.env, workspace)
        const before = new Set([
          ...running,
          ...(await storedAgentOutputSecrets(
            runtime.env,
            view.secrets,
            workspace,
          )),
        ])
        await view.secrets.removeValue(valueId)
        const after = new Set([
          ...running,
          ...(await agentOutputSecrets(
            runtime.env,
            view.secrets,
            workspace,
            runtime.now(),
          )),
        ])
        await view.output.maskTools(runtime.env, workspace.id, before, after)
        await pruneSavedOutputSecrets(runtime.env, view, after, before)
        return name
      })
      if (name !== null)
        await secretCapabilitiesChanged(
          runtime,
          operation,
          beforeFacts,
          [{ change: { kind: 'value-removed', names: [name] } }],
          member,
        )
    },
  )
}
