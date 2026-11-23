import type { OwnComputerLabel } from '../components/workspace/HeaderState'
import { ownWorkspaceWords as words } from '../components/own-computers/computerChoiceCopy'
import { orgs } from '../fixtures/orgs'
import { ownComputers, removedComputer } from '../fixtures/ownComputers'
import type { StartingLog } from '../fixtures/starting'
import type { WorkspaceState } from './workspaceState'

/** The name of the own computer of the workspace, or none on the cloud. */
function computerName(state: WorkspaceState): string | undefined {
  switch (state.computer) {
    case 'cloud':
      return undefined
    case 'own':
      return ownComputers['build-01'].name
    case 'full':
      return ownComputers['build-02'].name
    case 'offline':
    case 'went-offline':
      return ownComputers['lab-server'].name
    case 'removed':
      return removedComputer
  }
}

/**
 * Whether the own computer of the workspace is offline: lab-server, also
 * after it went offline while the workspace ran.
 */
function isOffline(state: WorkspaceState): boolean {
  return state.computer === 'offline' || state.computer === 'went-offline'
}

/** The time of a start that waits for an offline own computer. */
const offlineWait = '6m 40s'

/** The time of a start that waits for a free place on a full own computer. */
const fullWait = '4m 15s'

/**
 * The steps of a start on an own computer. A start on build-01 names it in
 * place of the cloud computer, and a resume names it too. A start on
 * lab-server, which is offline, waits for it to connect. A start on
 * build-02, which is full, waits for a free place there.
 */
export function computerStartLog(
  state: WorkspaceState,
  log: StartingLog,
  resume: boolean,
): StartingLog {
  const name = computerName(state)
  if (name === undefined) return log
  if (isOffline(state)) {
    const steps = [words.waitStep(name)]
    return { title: log.title, steps, elapsed: offlineWait }
  }
  if (state.computer === 'full') {
    const steps = [words.fullWaitStep(name)]
    return { title: log.title, steps, elapsed: fullWait }
  }
  const start = resume
    ? words.resumeStep(name)
    : words.startStep(name, orgs.acme.name)
  return { ...log, steps: [start, ...log.steps.slice(1)] }
}

/**
 * The message that the app saved for a failed start on an own computer
 * that it waited for: lab-server, which stayed offline, or build-02, which
 * stayed full. Each names the computer and the 20-minute limit of a start.
 */
export function computerStartError(state: WorkspaceState): string | undefined {
  const name = computerName(state)
  if (name === undefined) return undefined
  if (isOffline(state)) return words.offlineError(name)
  return state.computer === 'full' ? words.fullError(name) : undefined
}

/**
 * The message that the app saved for the stop of a workspace whose own
 * computer went offline, 2 minutes after the computer lost its connection.
 */
export function computerStopMessage(state: WorkspaceState): string | undefined {
  if (state.computer !== 'went-offline') return undefined
  return words.wentOffline(ownComputers['lab-server'].name)
}

/**
 * The own computer of an archived workspace, when an admin removed that
 * computer. The app deletes nothing there, so its files stay on that
 * server, and Restore cannot bring them back.
 */
export function removedArchiveComputer(
  state: WorkspaceState,
): string | undefined {
  const removed = state.sandbox === 'archived' && state.computer === 'removed'
  return removed ? removedComputer : undefined
}

/** The refusal of a start after an admin removed the own computer. */
export function computerRefusal(state: WorkspaceState): string | undefined {
  if (state.computer !== 'removed') return undefined
  return words.removedRefusal(removedComputer, orgs.acme.name)
}

/**
 * The own computer of the workspace in its header: the menu of the state
 * takes its name, and its first line says where the workspace runs.
 */
export function headerComputer(
  state: WorkspaceState,
): OwnComputerLabel | undefined {
  const name = computerName(state)
  if (name === undefined) return undefined
  return { name, line: words.runsOn(name, orgs.acme.name) }
}
