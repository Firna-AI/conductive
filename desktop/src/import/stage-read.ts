import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import { readImportScanRow } from '../../../src/shared/conductor-import-operation-read.ts'
import { readImportSnapshot } from '../../../src/shared/conductor-import-manifest-read.ts'
import {
  importHash,
  importInteger,
  importList,
  importNullableText,
  importObject,
  importOid,
  importText,
} from '../../../src/shared/conductor-import-values.ts'
import type {
  SourceFile,
  SourceInventory,
  SourceSession,
  SourceWorkspace,
} from './types.ts'
import { LocalImportError } from './types.ts'
import type { StageBuild, StageSource } from './stage-state.ts'
import { generatedId } from './stage-state.ts'

function session(value: unknown): SourceSession {
  const row = importObject(value)
  if (row.agent !== null && row.agent !== 'claude' && row.agent !== 'codex')
    throw new LocalImportError('read_failed')
  return {
    id: importText(row.id),
    title: importNullableText(row.title),
    agent: row.agent,
    model: importNullableText(row.model),
    nativeId: importNullableText(row.nativeId),
  }
}

function workspace(value: unknown): SourceWorkspace {
  const row = importObject(value)
  return {
    row: readImportScanRow(row.row),
    path: importNullableText(row.path),
    sessions: importList(row.sessions).map(session),
  }
}

function file(value: unknown): SourceFile {
  const row = importObject(value)
  const kind = row.kind
  if (
    kind !== 'file' &&
    kind !== 'directory' &&
    kind !== 'symlink' &&
    kind !== 'delete'
  )
    throw new LocalImportError('read_failed')
  if (typeof row.identity !== 'string')
    throw new LocalImportError('read_failed')
  return {
    path: importText(row.path),
    kind,
    mode: importInteger(row.mode),
    size: importInteger(row.size),
    identity: row.identity,
    ...(row.hash === undefined ? {} : { hash: importHash(row.hash) }),
    ...(row.target === undefined ? {} : { target: importText(row.target) }),
    ...(row.lfs === undefined ? {} : { lfs: lfs(row.lfs) }),
  }
}

function lfs(value: unknown): NonNullable<SourceFile['lfs']> {
  const row = importObject(value)
  if (row.mode !== '100644' && row.mode !== '100755')
    throw new LocalImportError('read_failed')
  return {
    blobOid: importOid(row.blobOid),
    payloadOid: importHash(row.payloadOid),
    size: importInteger(row.size),
    mode: row.mode,
  }
}

export function readStageSource(value: unknown): StageSource {
  const row = importObject(value)
  const source = importObject(row.source)
  if (source.objectFormat !== 'sha1' && source.objectFormat !== 'sha256')
    throw new LocalImportError('read_failed')
  const inventory: SourceInventory = {
    workspace: workspace(source.workspace),
    headOid: importOid(source.headOid),
    branch: importText(source.branch),
    objectFormat: source.objectFormat,
    commonDirectory: importText(source.commonDirectory),
    prerequisiteCandidates: importList(source.prerequisiteCandidates).map(
      importOid,
    ),
    files: importList(source.files).map(file),
    native: importList(source.native).map((value) => {
      const memory = importObject(value)
      return {
        session: session(memory.session),
        path: importNullableText(memory.path),
        identity: importNullableText(memory.identity),
        hash: memory.hash === null ? null : importHash(memory.hash),
      }
    }),
    digest: importHash(source.digest),
  }
  return {
    id: generatedId(importText(row.id)),
    scope: importText(row.scope),
    reservationId: importText(row.reservationId),
    source: inventory,
  }
}

export function readStageFacts(value: unknown): ImportRepositoryFacts {
  const row = importObject(value)
  return {
    id: importText(row.id),
    repositoryId: importInteger(row.repositoryId),
    fullName: importText(row.fullName),
    branch: importText(row.branch),
    branchHeadOid:
      row.branchHeadOid === null ? null : importOid(row.branchHeadOid),
    defaultBranch: importText(row.defaultBranch),
    defaultHeadOid:
      row.defaultHeadOid === null ? null : importOid(row.defaultHeadOid),
    observedAt: importInteger(row.observedAt),
  }
}

export function readStageBuild(value: unknown): StageBuild {
  const row = importObject(value)
  const stage = importObject(row.stage)
  if (typeof row.sealed !== 'boolean') throw new LocalImportError('read_failed')
  return {
    directory: generatedId(importText(row.directory)),
    sealed: row.sealed,
    facts: readStageFacts(row.facts),
    exclusions: importList(row.exclusions).map(importOid),
    omittedFiles: importList(row.omittedFiles).map((value) => {
      const file = importObject(value)
      return {
        path: importText(file.path),
        sizeBytes: importInteger(file.sizeBytes),
      }
    }),
    stage: {
      id: generatedId(importText(stage.id)),
      sourceDigest: importHash(stage.sourceDigest),
      row: readImportScanRow(stage.row),
      headOid: importOid(stage.headOid),
      candidates: importList(stage.candidates).map(importOid),
      snapshot: readImportSnapshot(stage.snapshot),
    },
  }
}
