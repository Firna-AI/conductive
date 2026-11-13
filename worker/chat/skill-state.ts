import type {
  RunnerSkillsUpdated,
  SkillsUpdated,
} from '../../src/shared/skills'
import { presentSkillReport } from './skill-reports'
import { chatKey } from './storage-keys'
import type { ChatData } from './types'

interface StoredSkillsState {
  /** The runner stream of the last skills report or `runner.ready`. */
  streamId: string
  /** True when that stream sent a report after its last `runner.ready`. */
  reported: boolean
  /** True when the last skills event of the workspace says unavailable. */
  unavailable: boolean
}

const STATE = chatKey('skills', 'state')

type Emit = (event: SkillsUpdated, occurredAt: number) => Promise<unknown>

/**
 * The state of the skill lists of one workspace. The lists themselves are
 * the latest `skills.updated` event of the history, so a tab gets them
 * also while the cloud computer sleeps.
 */
export class WorkspaceSkills {
  private readonly data: ChatData
  private readonly emit: Emit

  constructor(data: ChatData, emit: Emit) {
    this.data = data
    this.emit = emit
  }

  /** Stores a filtered report of a runner stream for the tabs. */
  async report(
    streamId: string,
    event: RunnerSkillsUpdated,
    occurredAt: number,
  ): Promise<void> {
    await this.emit(presentSkillReport(event), occurredAt)
    await this.save({ streamId, reported: true, unavailable: false })
  }

  /**
   * Counts a refused report as sent. A failed repair makes the list
   * unavailable until a newer complete report comes.
   */
  async refused(
    streamId: string,
    repairFailed: boolean,
    occurredAt: number,
  ): Promise<void> {
    const state = await this.read()
    const unavailable = state?.unavailable ?? false
    if (repairFailed && !unavailable) await this.unavailable(occurredAt)
    await this.save({
      streamId,
      reported: true,
      unavailable: unavailable || repairFailed,
    })
  }

  /**
   * A runner that reaches `runner.ready` with no skills report since its
   * connect sends no reports, such as an older runner.
   */
  async ready(streamId: string, occurredAt: number): Promise<void> {
    const state = await this.read()
    const reported = state?.streamId === streamId && state.reported
    let unavailable = state?.unavailable ?? false
    if (!reported && !unavailable) {
      await this.unavailable(occurredAt)
      unavailable = true
    }
    await this.save({ streamId, reported: false, unavailable })
  }

  private unavailable(occurredAt: number): Promise<unknown> {
    return this.emit({ type: 'skills.updated', skills: null }, occurredAt)
  }

  private read(): Promise<StoredSkillsState | undefined> {
    return this.data.get<StoredSkillsState>(STATE)
  }

  private save(state: StoredSkillsState): Promise<void> {
    return this.data.put(STATE, state)
  }
}
