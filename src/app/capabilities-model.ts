import {
  workspaceCapabilitiesPath,
  type UpdateWorkspaceCapabilitiesRequest,
} from '../shared/secrets'
import type { ApiClient } from './api/client'
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
 * the secrets that it pre-approves, the approvals of its sessions, and Mac
 * access. Every member changes them. A change shows at once and saves, and
 * its answer is the whole value. A failed change shows the saved value
 * again, and throws. A change applies to each session of the workspace from
 * that moment.
 */
export class WorkspaceCapabilitiesModel {
  readonly grants: Resource<WorkspaceGrants>
  private readonly api: ApiClient
  private readonly path: string

  constructor(api: ApiClient, orgId: string, workspaceId: string) {
    this.api = api
    this.path = workspaceCapabilitiesPath(orgId, workspaceId)
    this.grants = new Resource(() => api.get(this.path, readWorkspaceGrants))
  }

  read(): Promise<void> {
    return this.grants.read()
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

  /**
   * Turns Mac access on or off. While it is off, the Worker refuses each Mac
   * command request of the workspace.
   */
  setMacAccess(on: boolean): Promise<void> {
    return this.change((grants) => ({ ...grants, macAccess: on }), {
      macAccess: on,
    })
  }
}
