import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import type {
  RunWithSecretsRequest,
  RunWithSecretsResponse,
  SecretRequest,
  AnswerSecretRequest,
} from '../../src/shared/secret-requests'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatStorage, ChatCallbackPublisher } from '../chat/types'
import type { ChatTransaction } from '../chat/store'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import { activeStoredTurn, machineWorkspace } from '../devices/access'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { agentOutputSecrets, secretTextFilter } from './output-values'
import { answerSecretRequest } from './request-answer'
import {
  reconcileSecretRequests,
  SECRET_REQUEST_WAIT_MS,
} from './request-reconcile'
import {
  SecretRequestRecords,
  type StoredSecretRequest,
  openSecretRequest,
} from './request-records'
import { secretGrants } from './grant-data'
import { fetchSecretRequests } from './routes'
import { runWithSecrets } from './request-run'
import { deliverSecretNotice } from './notice-delivery'

export type SecretStateProjection = (
  request: SecretRequest,
  publish: ChatCallbackPublisher,
) => Promise<void>

export class SecretRuntime {
  readonly records: SecretRequestRecords
  readonly env: AppEnv
  readonly storage: ChatStorage
  readonly chat: WorkspaceChat
  readonly matches: (id: string) => boolean
  readonly now: () => number
  private readonly alarm: (at: number | null) => Promise<void>
  private readonly projection: SecretStateProjection
  private readonly waiters = new Map<string, () => void>()
  constructor(
    env: AppEnv,
    storage: ChatStorage,
    chat: WorkspaceChat,
    matches: (id: string) => boolean,
    now: () => number,
    alarm: (at: number | null) => Promise<void>,
    projection: SecretStateProjection,
  ) {
    this.env = env
    this.storage = storage
    this.chat = chat
    this.matches = matches
    this.now = now
    this.alarm = alarm
    this.projection = projection
    this.records = new SecretRequestRecords(storage)
  }

  fetch(request: Request) {
    return fetchSecretRequests(this, request)
  }

  async filter(
    view: ChatTransaction,
    workspace: { id: string; orgId: string },
    extra: readonly string[] = [],
  ) {
    return secretTextFilter([
      ...(await runningOutputSecrets(this.env, workspace)),
      ...(await agentOutputSecrets(
        this.env,
        view.secrets,
        workspace,
        this.now(),
      )),
      ...extra,
    ])
  }

  async save(view: ChatTransaction, record: StoredSecretRequest) {
    await view.secrets.save(record)
    await view.emit({
      type: 'secrets.request.updated',
      sessionId: record.request.sessionId,
      request: record.request,
    })
  }

  async publish(operation: WorkspaceOperation, record: StoredSecretRequest) {
    await operation.change((view) => this.save(view, record))
    await this.projection(record.request, async (event, at) => {
      await operation.change((view) => view.emit(event, at))
    })
    if (record.request.state !== 'waiting')
      this.waiters.get(record.request.id)?.()
  }

  async list(request: Request) {
    const workspace = await machineWorkspace(request, this.env)
    if (!this.matches(workspace.id))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    return this.chat.readWorkspace(workspace.id, async (view) => {
      const turnId = request.headers.get(TOOL_TURN_HEADER)
      const turn = turnId
        ? await activeStoredTurn(this.chat, workspace.id, turnId)
        : null
      const sessionId = turn?.sessionId ?? null
      const temporary = (await view.secrets.temporary(this.now())).filter(
        (value) => value.sessionId === null || value.sessionId === sessionId,
      )
      const secrets = await secretGrants(
        this.env.DB,
        workspace.orgId,
        workspace.id,
        sessionId,
      )
      return {
        secrets: secrets.map((secret) => ({
          name: secret.name,
          description: secret.description,
          available: Boolean(
            secret.grant ||
            (turn && temporary.some((value) => value.name === secret.name)),
          ),
        })),
      }
    })
  }

  run(
    request: Request,
    input: RunWithSecretsRequest,
  ): Promise<RunWithSecretsResponse> {
    return runWithSecrets(this, request, input)
  }

  async answer(
    workspaceId: string,
    id: string,
    answer: AnswerSecretRequest,
    member: MessageSender,
  ) {
    await this.reconcile()
    const { result, orgId, acceptedNotice, notices } =
      await this.chat.authorizedWorkspaceOperation(
        workspaceId,
        async () => {},
        async (operation) => {
          const record = await this.records.request(id)
          if (!record || record.request.workspaceId !== workspaceId)
            throw new HttpError(
              404,
              'secret_request_not_found',
              'The request is not available.',
            )
          const open = openSecretRequest(record.request)
          const { request: result, notices } = await answerSecretRequest(
            this,
            operation,
            record,
            answer,
            member,
          )
          await this.schedule()
          return {
            result,
            orgId: record.orgId,
            acceptedNotice: open && result.notice?.state === 'sent',
            notices,
          }
        },
      )
    if (acceptedNotice) await deliverSecretNotice(this, orgId, result)
    for (const notice of notices)
      await deliverSecretNotice(this, notice.orgId, notice.request)
    return result
  }

  async reconcile() {
    const workspaceId = await this.chat.store.workspaceId()
    if (!workspaceId) return
    const notices = await this.chat.authorizedWorkspaceOperation(
      workspaceId,
      async () => {},
      (operation) => reconcileSecretRequests(this, operation, workspaceId),
    )
    await this.schedule()
    for (const record of notices)
      await deliverSecretNotice(this, record.orgId, record.request)
  }

  async waiting(workspaceId: string) {
    return (await this.records.requests()).some(
      (record) =>
        record.request.workspaceId === workspaceId &&
        openSecretRequest(record.request),
    )
  }

  async schedule() {
    const times = (await this.records.requests())
      .filter((record) => record.request.state === 'waiting')
      .map((record) => record.request.createdAt + SECRET_REQUEST_WAIT_MS)
    for (const value of await this.records.temporary(this.now()))
      if (value.expiresAt !== null) times.push(value.expiresAt)
    await this.alarm(times.length ? Math.min(...times) : null)
  }

  async wait(id: string, deadline: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    await new Promise<void>((resolve) => {
      const done = () => {
        if (timer) clearTimeout(timer)
        this.waiters.delete(id)
        resolve()
      }
      this.waiters.set(id, done)
      timer = setTimeout(
        () => {
          void this.reconcile().catch(done)
        },
        Math.max(0, deadline - this.now()),
      )
      void this.records.request(id).then((record) => {
        if (!record || record.request.state !== 'waiting') done()
      }, done)
    })
  }
}
