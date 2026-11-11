import type { ReactNode } from 'react'
import { InstallScriptNotice } from '../components/workspace/InstallScriptNotice'
import { SoftwareUpdateBar } from '../components/workspace/SoftwareUpdateBar'
import { scriptRunLogs } from '../fixtures/scriptRuns'
import {
  creatingLog,
  creatingUpdateLog,
  failedUpdate,
  resumingLog,
  updatingLog,
  type StartingLog,
} from '../fixtures/starting'
import type { WorkspaceState } from './workspaceState'

/**
 * The steps of a resume, or of the start of a new workspace once its title
 * came, with the update of an earlier version of the agent and terminal
 * software. The update runs right after the resume or the start from the
 * org image. A failed update leaves its step marked, and the start goes on.
 */
export function startWithUpdate(
  state: WorkspaceState,
  kind: 'create' | 'resume',
): StartingLog {
  const plain = kind === 'create' ? creatingLog : resumingLog
  const updating = kind === 'create' ? creatingUpdateLog : updatingLog
  switch (state.software) {
    case 'current':
      return plain
    case 'earlier':
      return updating
    case 'update-failed':
      return failedUpdate(updating)
  }
}

/**
 * Whether the workspace is ready for a member to work in it: its sandbox
 * runs, and neither an archive nor a suspended org makes it read-only.
 */
function workable(state: WorkspaceState): boolean {
  return state.sandbox === 'ready' && state.org === 'active'
}

/**
 * The header of the workspace, with the warning bar after an update of the
 * agent and terminal software that failed at the start. The bar shows once
 * the workspace is ready, until its next start.
 */
export function withSoftwareBar(
  state: WorkspaceState,
  header: ReactNode,
): ReactNode {
  if (state.software !== 'update-failed' || !workable(state)) return header
  return (
    <>
      {header}
      <SoftwareUpdateBar />
    </>
  )
}

/**
 * The notice over the composer when the workspace started from an org
 * image with an earlier install script, and the run of the current script
 * that its action starts. A workspace that is not ready shows none.
 */
export function installScriptNotice(state: WorkspaceState): ReactNode {
  if (state.setup === 'current' || !workable(state)) return undefined
  return (
    <InstallScriptNotice
      output={scriptRunLogs[state.setup]}
      run={state.setup}
    />
  )
}
