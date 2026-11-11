import {
  readImportManifestEntry,
  readImportPart,
  readImportSnapshot,
} from './conductor-import-manifest-read.ts'
import {
  importHash,
  importInteger,
  importList,
  importObject,
  importText,
} from './conductor-import-values.ts'
import {
  runnerImportWire,
  type RunnerImportAction,
  type RunnerImportCommand,
  type RunnerImportReply,
} from './runner-import.ts'

function identity(value: unknown) {
  runnerImportWire(value)
  const row = importObject(value)
  return {
    commandId: importText(row.commandId),
    activationId: importText(row.activationId),
    epoch: importInteger(row.epoch),
    connectionId: importText(row.connectionId),
  }
}

export function readRunnerImportCommand(value: unknown): RunnerImportCommand {
  const row = importObject(value)
  if (row.type !== 'import.command') throw new Error('Invalid import command.')
  const input = importObject(row.action)
  let action: RunnerImportAction
  if (input.kind === 'open')
    action = {
      kind: input.kind,
      snapshot: readImportSnapshot(input.snapshot),
      workspaceId: importText(input.workspaceId),
      defaultBranch: importText(input.defaultBranch),
      deadlineAt: importInteger(input.deadlineAt),
    }
  else if (input.kind === 'manifest')
    action = {
      kind: input.kind,
      offset: importInteger(input.offset),
      entries: importList(input.entries).map(readImportManifestEntry),
    }
  else if (input.kind === 'chunk')
    action = {
      kind: input.kind,
      part: readImportPart(input.part),
      offset: importInteger(input.offset),
      length: importInteger(input.length),
      sha256: importHash(input.sha256),
      base64:
        typeof input.base64 === 'string'
          ? input.base64
          : importText(input.base64),
    }
  else if (input.kind === 'session')
    action = { kind: input.kind, documentId: importText(input.documentId) }
  else if (
    input.kind === 'preflight' ||
    input.kind === 'restore' ||
    input.kind === 'finish'
  )
    action = { kind: input.kind }
  else throw new Error('Invalid import action.')
  return { type: 'import.command', ...identity(value), action }
}

export function readRunnerImportReply(value: unknown): RunnerImportReply {
  const row = importObject(value)
  if (row.type !== 'import.result') throw new Error('Invalid import reply.')
  const result = importObject(row.result)
  if (result.ok === true) {
    if (
      result.preparation !== undefined &&
      result.preparation !== 'prepared' &&
      result.preparation !== 'fallback'
    )
      throw new Error('Invalid import preparation.')
    return {
      type: 'import.result',
      ...identity(value),
      result: {
        ok: true,
        preparation: result.preparation,
        ...(result.requiredBytes === undefined
          ? {}
          : { requiredBytes: importText(result.requiredBytes) }),
        ...(result.availableBytes === undefined
          ? {}
          : { availableBytes: importText(result.availableBytes) }),
      },
    }
  }
  if (result.ok !== false) throw new Error('Invalid import result.')
  const error = importObject(result.error)
  return {
    type: 'import.result',
    ...identity(value),
    result: {
      ok: false,
      error: {
        code: importText(error.code),
        message: importText(error.message),
        ...(error.requiredBytes === undefined
          ? {}
          : { requiredBytes: importText(error.requiredBytes) }),
        ...(error.availableBytes === undefined
          ? {}
          : { availableBytes: importText(error.availableBytes) }),
      },
    },
  }
}
