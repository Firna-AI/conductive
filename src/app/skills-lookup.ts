import type { NoSkillsCause } from '../ui/components/settings/skillsCopy'
import {
  orgSettingsPaths,
  type OrgSettings,
  type SkillsRepositoryLookupResponse,
} from '../shared/org-settings'
import type { ApiClient } from './api/client'
import { readSkillsLookup } from './api/read-settings'
import type { Resource } from './resource'
import {
  asApiError,
  derived,
  loading,
  ready,
  Store,
  type Loadable,
  type Readable,
  valueOf,
} from './store'

/**
 * What the Skills section shows for an answer of the lookup: the list of
 * skills, a notice in place of the list, or the notice of a lookup that
 * failed. `incomplete` adds the note of a file tree that GitHub cut short.
 */
export type ShownSkills =
  | { kind: 'list'; skills: readonly string[]; incomplete: boolean }
  | { kind: 'notice'; cause: NoSkillsCause }
  | { kind: 'failed' }

/**
 * The part of the Skills section for an answer of the lookup of a saved
 * repository. A cut file tree gives the skills that it holds with the note
 * of the cut, also when it holds no skill, because its skills can lie
 * after the cut. A repository without a skill gives the notice of a
 * repository without skills.
 */
export function shownSkills(
  found: SkillsRepositoryLookupResponse,
): ShownSkills {
  switch (found.notice) {
    case 'failed':
      return { kind: 'failed' }
    case 'private':
    case 'not-found':
      return { kind: 'notice', cause: found.notice }
    case 'incomplete':
      return { kind: 'list', skills: found.skills, incomplete: true }
    case 'no-skills':
      return { kind: 'notice', cause: 'without-skills' }
    case null:
      return found.skills.length === 0
        ? { kind: 'notice', cause: 'without-skills' }
        : { kind: 'list', skills: found.skills, incomplete: false }
  }
}

/**
 * The lookup of the skills repository of an org, which the Skills section
 * of the Cloud computer tab shows. Nothing stores its list, so each read
 * asks the Worker, which reads the saved repository on GitHub. Only the
 * answer of the newest read shows, so the read after a Save wins over an
 * older read. A failed read shows its error in place of the last answer.
 */
export class SkillsLookup {
  private readonly shown = new Store<Loadable<SkillsRepositoryLookupResponse>>(
    loading,
  )
  readonly store: Readable<Loadable<SkillsRepositoryLookupResponse>>
  private readonly api: ApiClient
  private readonly orgId: string
  private readonly settings: Resource<OrgSettings>
  private settingsAtRead: OrgSettings | undefined
  private reconciled: SkillsRepositoryLookupResponse | null = null
  /** Counts the reads, so that an answer knows when a newer read started. */
  private reads = 0

  constructor(api: ApiClient, orgId: string, settings: Resource<OrgSettings>) {
    this.api = api
    this.orgId = orgId
    this.settings = settings
    this.store = derived(settings.store, this.shown, (saved, found) =>
      found.state === 'ready' &&
      (saved.state !== 'ready' ||
        found.value.repository !== (saved.value.skillsRepository ?? ''))
        ? loading
        : found,
    )
  }

  private savedRepository(): string | undefined {
    const saved = valueOf(this.settings.store.get())
    return saved ? (saved.skillsRepository ?? '') : undefined
  }

  /**
   * While the tab shows, every changed saved repository starts a lookup,
   * whether a read, another setting's save, or a closed tab supplied it.
   * The initial settings answer shares the lookup that opening starts.
   */
  follow(current: () => boolean): () => void {
    let repository = this.savedRepository()
    return this.settings.store.subscribe(() => {
      const next = this.savedRepository()
      const changed =
        repository !== undefined && next !== undefined && next !== repository
      repository = next
      if (changed) {
        this.clear()
        void this.read(current)
      } else void this.reconcile(current)
    })
  }

  /**
   * Every repository Save looks up again, even if its canonical value did
   * not change. A lookup already started for this settings answer counts.
   */
  afterSave(current: () => boolean): void {
    if (this.settingsAtRead === valueOf(this.settings.store.get())) return
    this.clear()
    void this.read(current)
  }

  /** A mismatched answer can be newer than settings. Read them once for it. */
  private reconcile(current: () => boolean): Promise<void> {
    const found = this.shown.get()
    const repository = this.savedRepository()
    if (
      !current() ||
      found.state !== 'ready' ||
      repository === undefined ||
      found.value.repository === repository ||
      this.reconciled === found.value
    )
      return Promise.resolve()
    this.reconciled = found.value
    return this.settings.read(current)
  }

  /**
   * Shows the load in place of the last answer, as after a Save, whose
   * repository can differ from the one of that answer.
   */
  clear(): void {
    this.shown.set(loading)
  }

  /**
   * Reads the skills of the saved repository. The answer changes nothing
   * when `current` returns false, such as after its tab closed, or when a
   * newer read started.
   */
  async read(current: () => boolean): Promise<void> {
    this.settingsAtRead = valueOf(this.settings.store.get())
    const run = ++this.reads
    const shows = () => current() && run === this.reads
    let found: SkillsRepositoryLookupResponse
    try {
      found = await this.api.get(
        orgSettingsPaths.skills(this.orgId),
        readSkillsLookup,
      )
    } catch (error) {
      if (shows()) this.shown.set({ state: 'failed', error: asApiError(error) })
      return
    }
    if (shows()) {
      this.shown.set(ready(found))
      await this.reconcile(current)
    }
  }
}
