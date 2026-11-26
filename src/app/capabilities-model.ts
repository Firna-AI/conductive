import {
  secretRequestsPath,
  workspaceSecretValuePath,
  type WorkspaceSecretValue,
} from '../shared/secret-requests'
import { readSecretRequestsResponse } from '../shared/secret-requests-read'
import {
  workspaceCapabilitiesPath,
  type UpdateWorkspaceCapabilitiesRequest,
} from '../shared/secrets'
import type { ApiClient } from './api/client'
import { ignore, ParseError } from './api/parse'
import type { OrgModel } from './org-model'
import { readWorkspaceGrants, type WorkspaceGrants } from './api/read-secrets'
import { Resource, type Change } from './resource'
import { valueOf } from './store'

/** The pre-approved secrets with one secret added or taken out. */
export function withPreapproval(
  ids: readonly string[],
  secretId: string,
  on: boolean,
): string[] {
  const others = ids.filter((id) => id !== secretId)
  return on ? [...others, secretId] : others
}

/**
 * The Capabilities of one workspace that exists (secrets decision 8 B):
 * the secrets that it pre-approves, the approvals of its sessions, and the
 * values that members gave for the workspace. Every member changes them. A
 * change shows at once and saves, and its answer is the whole value. A
 * failed change shows the saved value again, and throws. A change applies
 * to each session of the workspace from that moment. The answer also holds
 * the stored Mac access of the workspace, which no page changes and which
 * gates nothing (Mac access decision 7).
 */
export class WorkspaceCapabilitiesModel {
  readonly grants: Resource<WorkspaceGrants>
  /**
   * The values that members gave for the workspace, by name, with no value.
   * A value for 15 minutes is not in the list: it ends by itself.
   */
  readonly values: Resource<readonly WorkspaceSecretValue[]>
  private readonly api: ApiClient
  private readonly path: string
  private readonly valuePath: (id: string) => string

  constructor(api: ApiClient, orgId: string, workspaceId: string) {
    this.api = api
    this.path = workspaceCapabilitiesPath(orgId, workspaceId)
    this.valuePath = (id) => workspaceSecretValuePath(orgId, workspaceId, id)
    this.grants = new Resource(() => api.get(this.path, readWorkspaceGrants))
    this.values = new Resource<readonly WorkspaceSecretValue[]>(() =>
      api.get(secretRequestsPath(orgId, workspaceId), readValues),
    )
  }

  read(): Promise<void> {
    return Promise.all([this.grants.read(), this.values.read()]).then(
      () => undefined,
    )
  }

  /**
   * Reads each part that has no answer yet, such as before the control first
   * opens. A part that shows keeps its answer until the next `read`.
   */
  preload(): Promise<void> {
    const parts = [this.grants, this.values].filter(
      (part) => part.store.get().state !== 'ready',
    )
    return Promise.all(parts.map((part) => part.read())).then(() => undefined)
  }

  /**
   * Removes a value of the workspace, which ends its grant. The row goes at
   * once, and comes back after a failure.
   */
  async removeValue(id: string): Promise<void> {
    await this.values.write(
      (values) => values.filter((value) => value.id !== id),
      () => this.api.send('DELETE', this.valuePath(id), {}, ignore),
      () => (values) => values.filter((value) => value.id !== id),
    )
  }

  private async change(
    show: Change<WorkspaceGrants>,
    request: UpdateWorkspaceCapabilitiesRequest,
  ): Promise<void> {
    await this.grants.write(
      show,
      () => this.api.send('PATCH', this.path, request, readWorkspaceGrants),
      (answer) => () => answer,
    )
  }

  /**
   * Pre-approves a secret for the workspace, or ends its pre-approval. The
   * request names the whole set of the pre-approved secrets, as it shows.
   */
  setPreapproved(secretId: string, on: boolean): Promise<void> {
    const shown = valueOf(this.grants.store.get())
    if (!shown) return Promise.resolve()
    const next = withPreapproval(shown.preapprovedSecretIds, secretId, on)
    return this.change(
      (grants) => ({ ...grants, preapprovedSecretIds: next }),
      { preapprovedSecretIds: next },
    )
  }

  /** Ends the approval of one secret in one session. */
  removeApproval(secretId: string, sessionId: string): Promise<void> {
    return this.change(
      (grants) => ({
        ...grants,
        sessionApprovals: grants.sessionApprovals.filter(
          (item) => item.secretId !== secretId || item.sessionId !== sessionId,
        ),
      }),
      { removeSessionApprovals: [{ secretId, sessionId }] },
    )
  }
}

/** The kept Capabilities of each org, by workspace ID. */
const kept = new WeakMap<OrgModel, Map<string, WorkspaceCapabilitiesModel>>()

/**
 * The Capabilities of a workspace of `org`. They stay while the org model
 * stays, so a workspace can read them before its control opens, and the
 * control shows the last answer at once.
 */
export function keptCapabilities(
  org: OrgModel,
  workspaceId: string,
): WorkspaceCapabilitiesModel {
  let models = kept.get(org)
  if (!models) {
    models = new Map()
    kept.set(org, models)
  }
  let model = models.get(workspaceId)
  if (!model) {
    model = new WorkspaceCapabilitiesModel(
      org.services.api,
      org.orgId,
      workspaceId,
    )
    models.set(workspaceId, model)
  }
  return model
}

/** The values of the workspace from the list of its requests. */
function readValues(value: unknown): readonly WorkspaceSecretValue[] {
  try {
    return readSecretRequestsResponse(value).workspaceValues
  } catch {
    throw new ParseError('The secret requests are not readable.')
  }
}
