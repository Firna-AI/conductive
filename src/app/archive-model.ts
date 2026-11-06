import {
  workspacePaths,
  type ArchiveCheckResponse,
  type WorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { readArchiveCheck, readWorkspaceResponse } from './api/read-workspaces'
import type { OrgModel } from './org-model'
import { asApiError, Store } from './store'

/** The Archive question: the check runs first, then the user confirms. */
export type ArchiveFlow =
  | { step: 'closed' }
  | { step: 'checking' }
  | { step: 'check-failed'; error: ApiError }
  | {
      step: 'confirm'
      check: ArchiveCheckResponse
      archiving: boolean
      error: ApiError | null
    }

/** The check found work that Archive would delete. */
export function hasUnpushedWork(check: ArchiveCheckResponse): boolean {
  return check.uncommittedFiles.length > 0 || check.unpushedCommits > 0
}

/**
 * Archive of one workspace (decision 16). It checks the sandbox for work
 * that is not committed or not pushed, lists it, and archives only after
 * the user confirms. Found work needs the explicit discard. A cancel makes
 * a check that still runs obsolete, so its answer opens no question.
 */
export class ArchiveModel {
  readonly flow = new Store<ArchiveFlow>({ step: 'closed' })
  private readonly org: OrgModel
  private readonly workspaceId: string
  private readonly archived: (detail: WorkspaceResponse) => void
  /** Each start and each cancel counts one up, so an old answer is ignored. */
  private generation = 0

  constructor(
    org: OrgModel,
    workspaceId: string,
    archived: (detail: WorkspaceResponse) => void,
  ) {
    this.org = org
    this.workspaceId = workspaceId
    this.archived = archived
  }

  async start(): Promise<void> {
    const run = ++this.generation
    this.flow.set({ step: 'checking' })
    let check: ArchiveCheckResponse
    try {
      check = await this.org.services.api.get(
        workspacePaths.archiveCheck(this.org.orgId, this.workspaceId),
        readArchiveCheck,
      )
    } catch (error) {
      if (run === this.generation) {
        this.flow.set({ step: 'check-failed', error: asApiError(error) })
      }
      return
    }
    if (run !== this.generation) return
    this.flow.set({ step: 'confirm', check, archiving: false, error: null })
  }

  cancel(): void {
    this.generation += 1
    this.flow.set({ step: 'closed' })
  }

  async confirm(): Promise<void> {
    const flow = this.flow.get()
    if (flow.step !== 'confirm' || flow.archiving) return
    const run = this.generation
    this.flow.set({ ...flow, archiving: true, error: null })
    try {
      const detail = await this.org.services.api.send(
        'POST',
        workspacePaths.archive(this.org.orgId, this.workspaceId),
        { discardUnpushedWork: hasUnpushedWork(flow.check) },
        readWorkspaceResponse,
      )
      this.archived(detail)
      if (run === this.generation) this.flow.set({ step: 'closed' })
    } catch (error) {
      if (run !== this.generation) return
      this.flow.set({ ...flow, archiving: false, error: asApiError(error) })
    }
  }
}
