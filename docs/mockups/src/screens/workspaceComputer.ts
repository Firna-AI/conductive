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
    case 'offline':
      return ownComputers['lab-server'].name
    case 'removed':
      return removedComputer
  }
}

/** The time of a start that waits for an offline own computer. */
const offlineWait = '6m 40s'

/**
 * The steps of a start on an own computer. A start on build-01 names it in
 * place of the cloud computer, and a resume names it too. A start on
 * lab-server, which is offline, waits for it to connect.
 */
export function computerStartLog(
  state: WorkspaceState,
  log: StartingLog,
  resume: boolean,
): StartingLog {
  const name = computerName(state)
  if (name === undefined) return log
  if (state.computer === 'offline') {
    const steps = [words.waitStep(name)]
    return { title: log.title, steps, elapsed: offlineWait }
  }
  const start = resume
    ? words.resumeStep(name)
    : words.startStep(name, orgs.acme.name)
  return { ...log, steps: [start, ...log.steps.slice(1)] }
}

/**
 * The message that the app saved for a failed start on an own computer
 * that stayed offline: it names the 20-minute limit of a start.
 */
export function computerStartError(state: WorkspaceState): string | undefined {
  const name = computerName(state)
  if (state.computer !== 'offline' || name === undefined) return undefined
  return words.offlineError(name)
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
