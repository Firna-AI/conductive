import type {
  RunWithSecretsRequest,
  RunWithSecretsResponse,
  SecretRequest,
} from '../../src/shared/secret-requests'
import { machineWorkspace } from '../devices/access'
import { HttpError } from '../http'
import { randomToken } from '../security/crypto'
import { secretRunAccess } from './request-access'
import { SECRET_REQUEST_WAIT_MS } from './request-reconcile'
import { grantedRun, resolveSecretNames } from './run-values'
import type { SecretRuntime } from './runtime'

export async function runWithSecrets(
  runtime: SecretRuntime,
  request: Request,
  input: RunWithSecretsRequest,
): Promise<RunWithSecretsResponse> {
  const workspace = await machineWorkspace(request, runtime.env)
  const result = await runtime.chat.authorizedWorkspaceOperation(
    workspace.id,
    async () => {},
    async (operation) => {
      const access = await secretRunAccess(
        runtime.env,
        runtime.chat,
        request,
        runtime.matches,
      )
      const id = randomToken()
      const granted = await grantedRun(runtime, operation, request, input, id)
      if (granted) return { response: granted }
      const record = await runtime.chat.store.read(
        workspace.id,
        async (view) => {
          const names = await resolveSecretNames(
            runtime,
            view,
            workspace.orgId,
            workspace.id,
            access.turn.sessionId,
            input.names,
          )
          const filter = await runtime.filter(view, workspace)
          return {
            orgId: workspace.orgId,
            tokenHash: workspace.tokenHash,
            names: input.names,
            request: {
              id,
              workspaceId: workspace.id,
              sessionId: access.turn.sessionId,
              turnId: access.turn.id,
              sender: access.sender,
              secrets: names
                .filter((item) => !item.temporary && !item.secret?.grant)
                .map((item) => ({
                  name: item.name,
                  secretId: item.secret?.id ?? null,
                  description: filter(item.secret?.description ?? ''),
                })),
              reason: filter(input.reason ?? ''),
              command: filter(input.command),
              state: 'waiting' as const,
              late: false,
              createdAt: runtime.now(),
              updatedAt: runtime.now(),
              answeredBy: null,
              lifetime: null,
              endedBy: null,
              notice: null,
            },
          }
        },
      )
      await runtime.publish(operation, record)
      await runtime.schedule()
      return { record }
    },
  )
  if (result.response) return result.response
  const record = result.record
  await runtime.wait(
    record.request.id,
    record.request.createdAt + SECRET_REQUEST_WAIT_MS,
  )
  return runtime.chat.authorizedWorkspaceOperation(
    workspace.id,
    async () => {},
    async (operation) => {
      const current = await runtime.records.request(record.request.id)
      if (!current)
        throw new HttpError(
          404,
          'secret_request_not_found',
          'The request is not available.',
        )
      if (current.request.state === 'allowed' && !current.lateAnswer) {
        const allowed = await grantedRun(
          runtime,
          operation,
          request,
          input,
          record.request.id,
        )
        if (allowed) return allowed
        return {
          status: 'not-answered',
          requestId: record.request.id,
          message:
            'The secret changed. Run the command again to request access.',
        }
      }
      return requestResult(current.request)
    },
  )
}

function requestResult(request: SecretRequest): RunWithSecretsResponse {
  if (request.state === 'denied')
    return {
      status: 'denied',
      requestId: request.id,
      message: `${request.answeredBy?.displayName ?? request.answeredBy?.githubLogin ?? 'A member'} denied the request. The command did not run.`,
    }
  if (request.state === 'not-answered')
    return {
      status: 'not-answered',
      requestId: request.id,
      message: `The request was not answered: ${request.endedBy}. The command did not run.`,
    }
  return {
    status: 'pending',
    requestId: request.id,
    message:
      'The command did not run. The request stays open. A member can answer it later. A message will follow when a member allows it.',
  }
}
