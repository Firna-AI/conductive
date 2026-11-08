import type { WorkspaceResponse, WorkspaceState } from '../shared/workspaces'
import type { StreamEnvelope } from './api/read-events'
import {
  NewWorkspaceModel,
  type CreationStartError,
  type Draft,
} from './new-workspace-model'
import type { OrgModel } from './org-model'
import { Store, type Readable } from './store'

/** A first message that the server admitted, as its form sent it. */
export interface Submission {
  workspaceId: string
  sectionId: string | null
  /** The text, the files, the message ID, the repository, and the model. */
  draft: Draft
}

/** An admitted create while its start runs, or after its start failed. */
export type Creation =
  | { state: 'starting'; submission: Submission }
  | { state: 'failed'; submission: Submission; form: NewWorkspaceModel }

/**
 * The creates of one signed-in person in this tab. A sign-out, or a sign-in
 * of another person, ends it. A send that started in it then changes
 * nothing when its answer comes.
 */
export interface Lifetime {
  readonly live: boolean
  /** Runs `callback` when the life ends. The returned function cancels it. */
  onEnd(callback: () => void): () => void
}

class Life implements Lifetime {
  live = true
  private readonly callbacks = new Set<() => void>()

  onEnd(callback: () => void): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  end(): void {
    this.live = false
    for (const callback of [...this.callbacks]) callback()
    this.callbacks.clear()
  }
}

/**
 * The states that only a started sandbox reaches: the server sets them
 * after the start is prepared and the runner is connected. A stopped or an
 * archived workspace proves no start.
 */
const started: ReadonlySet<WorkspaceState> = new Set([
  'ready',
  'working',
  'input',
  'unread',
])

/**
 * A create whose sandbox did not start: the workspace shows the error state,
 * and its create start shows a failed step. The server removes such a
 * workspace, so it has no Resume, and it keeps no files. A create whose
 * start finished keeps its start record, so a later error of its sandbox
 * shows no failed step, and its workspace stays.
 */
export function failedCreate(
  detail: Pick<WorkspaceResponse, 'workspace' | 'start'>,
): boolean {
  const { workspace, start } = detail
  return (
    workspace.state === 'error' &&
    start?.kind === 'create' &&
    start.steps.some((step) => step.state === 'failed')
  )
}

/**
 * The admitted creates of one org in this tab. Each keeps the message that
 * its form sent until its start ends. Only a state that a started sandbox
 * reaches ends it well, and the owner then forgets it. An error state, or a
 * 404 of its workspace, ends it badly: the owner takes the workspace out of
 * the list, and gives the message back in a form of its own, which the
 * address of the workspace shows. So a newer draft of the section stays,
 * and two messages of one section get two forms. The owner reads the
 * events that the kept workspace of the shell gives it, so it opens no
 * socket of its own. It keeps nothing in browser storage. A sign-out, or a
 * sign-in of another person, ends the life of the creates, with the sends
 * that still run.
 */
export class Creations {
  private readonly entries = new Store<ReadonlyMap<string, Creation>>(new Map())
  private readonly org: OrgModel
  private life = new Life()

  constructor(org: OrgModel) {
    this.org = org
  }

  /** The life of the creates of the person who is signed in now. */
  get lifetime(): Lifetime {
    return this.life
  }

  /** The create of a workspace, or null. */
  of(workspaceId: string): Readable<Creation | null> {
    return {
      get: () => this.entries.get().get(workspaceId) ?? null,
      subscribe: this.entries.subscribe,
    }
  }

  /** A form hands over a message that the server admitted. */
  admit(submission: Submission): void {
    this.put(submission.workspaceId, { state: 'starting', submission })
  }

  /** An ordered event of a workspace, from its stream. */
  observe(workspaceId: string, envelope: StreamEnvelope): void {
    const event = envelope.shell
    if (event?.type !== 'workspace.updated') return
    const entry = this.entries.get().get(workspaceId)
    if (entry?.state === 'failed' && event.error !== undefined)
      entry.form.setStartError(event.error)
    if (event.workspace.state === 'error') this.fail(workspaceId, event.error)
    else if (started.has(event.workspace.state)) this.release(workspaceId)
  }

  /** The open of a workspace answered 404: a create that starts failed. */
  removed(workspaceId: string): void {
    this.fail(workspaceId)
  }

  /** The message of a failed create went out again, to another workspace. */
  forget(workspaceId: string): void {
    if (!this.entries.get().has(workspaceId)) return
    const next = new Map(this.entries.get())
    next.delete(workspaceId)
    this.entries.set(next)
  }

  /**
   * A sign-out, or another person: every create goes, and each send that
   * still runs ends, so that its answer changes nothing.
   */
  clear(): void {
    this.life.end()
    this.life = new Life()
    if (this.entries.get().size > 0) this.entries.set(new Map())
  }

  private fail(workspaceId: string, error?: CreationStartError | null): void {
    const entry = this.entries.get().get(workspaceId)
    if (entry?.state !== 'starting') return
    const { submission } = entry
    const form = new NewWorkspaceModel(
      this.org,
      submission.sectionId,
      submission,
      error,
    )
    this.org.removeWorkspace(workspaceId)
    this.put(workspaceId, { state: 'failed', submission, form })
  }

  private release(workspaceId: string): void {
    if (this.entries.get().get(workspaceId)?.state === 'starting') {
      this.forget(workspaceId)
    }
  }

  private put(workspaceId: string, creation: Creation): void {
    this.entries.set(new Map(this.entries.get()).set(workspaceId, creation))
  }
}
