import type {
  SandboxNoticeState,
  SandboxPanelState,
} from '../../../docs/mockups/src/components/workspace/sandboxNoticeState'
import type { ApiError } from '../../app/api/client'
import type { SandboxState } from './features'
import { orgRefusal, refusedStart } from './SandboxNotice'

/** What the screen shows of the sandbox of an open workspace. */
export interface SandboxView {
  /** A refused start: the org is suspended, or the owner of the workspace. */
  refusal: SandboxNoticeState | null
  /** The bar in place of the composer, or null for the composer. */
  bar: SandboxNoticeState | null
  /**
   * What the files and the tools show in place of their content, if
   * anything: the notice of the bar, also a refusal with its words, or the
   * wait of a start.
   */
  panel: SandboxPanelState | null
  /** The notice of a suspended org shows above the bar of an archived workspace. */
  orgNotice: boolean
}

/**
 * The view of the sandbox. A suspended org refuses each start and each new
 * access to the sandbox, also while the stop of its cloud computer runs.
 * Another refused start shows while the sandbox is down, until its cause
 * ends. An archived workspace keeps its bar in a suspended org too. A
 * failed start carries the message that the workspace saved for it.
 */
export function sandboxView(input: {
  sandbox: SandboxState
  suspended: boolean
  startError: ApiError | null
  /** The message that the workspace saved for a start that failed. */
  savedError: string | null
}): SandboxView {
  const { sandbox, suspended } = input
  const refusal =
    suspended && sandbox !== 'archived'
      ? orgRefusal
      : sandbox === 'stopped' || sandbox === 'error'
        ? refusedStart(input.startError)
        : null
  const bar: SandboxNoticeState | null =
    refusal ??
    (sandbox === 'error'
      ? { problem: 'error', message: input.savedError }
      : sandbox === 'ready' || sandbox === 'starting'
        ? null
        : { problem: sandbox })
  return {
    refusal,
    bar,
    panel: bar ?? (sandbox === 'starting' ? { problem: 'starting' } : null),
    orgNotice: suspended && sandbox === 'archived',
  }
}
