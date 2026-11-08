import type { ApiError } from '../../app/api/client'
import type { SandboxState } from './features'
import {
  orgRefusal,
  refusedStart,
  type SandboxNoticeState,
  type SandboxProblem,
} from './SandboxNotice'

/** What the screen shows of the sandbox of an open workspace. */
export interface SandboxView {
  /** A refused start: the org is suspended, or the owner of the workspace. */
  refusal: SandboxNoticeState | null
  /** The bar in place of the composer, or null for the composer. */
  bar: SandboxNoticeState | null
  /** What the files and the tools show in place of their content, if anything. */
  panel: 'starting' | SandboxProblem | null
  /** The notice of a suspended org shows above the bar of an archived workspace. */
  orgNotice: boolean
}

/**
 * The view of the sandbox. A suspended org refuses each start and each new
 * access to the sandbox, also while the stop of its cloud computer runs.
 * Another refused start shows while the sandbox is down, until its cause
 * ends. An archived workspace keeps its bar in a suspended org too.
 */
export function sandboxView(input: {
  sandbox: SandboxState
  suspended: boolean
  startError: ApiError | null
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
    (sandbox === 'ready' || sandbox === 'starting'
      ? null
      : { problem: sandbox })
  return {
    refusal,
    bar,
    panel: refusal ? 'refused' : sandbox === 'ready' ? null : sandbox,
    orgNotice: suspended && sandbox === 'archived',
  }
}
