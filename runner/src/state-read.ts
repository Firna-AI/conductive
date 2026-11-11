import { readImportSessionMetadata } from '../../src/shared/import-session'
import { parseBranches } from './instruction-state'
import { array, integer, object, oneOf, string } from './parse'
import { parseReports } from './report-state'
import type { RunnerState } from './state'
import { parseSavedTurn } from './state-turns'
import { parseEnvelope } from './stored-events'

export function parseState(value: unknown): RunnerState {
  const input = object(value)
  const revisions = object(input.fileRevisions)
  const state: RunnerState = {
    streamId: string(input.streamId),
    nextEventNumber: integer(input.nextEventNumber),
    confirmedThrough: integer(input.confirmedThrough),
    fileRevisions: {
      tree: integer(revisions.tree),
      changes: integer(revisions.changes),
    },
    outbox: array(input.outbox, parseEnvelope),
    turns: array(input.turns, parseSavedTurn),
    reports: parseReports(input.reports),
    sessions: array(input.sessions, (value) => {
      const session = object(value)
      return {
        sessionId: string(session.sessionId),
        agent: oneOf(session.agent, ['claude', 'codex']),
        ...(session.conductorImport === undefined
          ? {}
          : {
              conductorImport: readImportSessionMetadata(
                session.conductorImport,
              ),
            }),
        ...(session.importFallbackTurnId === undefined
          ? {}
          : { importFallbackTurnId: string(session.importFallbackTurnId) }),
        ...(session.instructions === undefined
          ? {}
          : { instructions: string(session.instructions) }),
        ...(session.instructionBranches === undefined
          ? {}
          : {
              instructionBranches:
                session.instructionBranches === null
                  ? null
                  : parseBranches(session.instructionBranches),
            }),
        providerSessionId:
          session.providerSessionId === null
            ? null
            : string(session.providerSessionId),
      }
    }),
  }
  let expected = state.confirmedThrough + 1
  for (const item of state.outbox) {
    if (item.streamId !== state.streamId || item.eventNumber !== expected++) {
      throw new Error('The saved runner outbox is not contiguous.')
    }
  }
  if (state.nextEventNumber !== expected)
    throw new Error('The saved runner counter does not match its outbox.')
  return state
}
