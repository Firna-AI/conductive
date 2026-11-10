import type { ImportPart } from './conductor-import-storage.ts'
import type {
  ImportManifestEntry,
  ImportSnapshot,
} from './conductor-import-manifest.ts'
import { readImportGitDisk } from './conductor-import-git-disk-read.ts'
import {
  ImportContractError,
  importBranch,
  importHash,
  importInteger,
  importNullableText,
  importNativeId,
  importObject,
  importOid,
  importPath,
  importText,
  importRepositoryName,
} from './conductor-import-values.ts'

export function readImportSnapshot(value: unknown): ImportSnapshot {
  const row = importObject(value)
  if (
    row.version !== 1 ||
    !['sha1', 'sha256'].includes(String(row.objectFormat))
  )
    throw new ImportContractError()
  const objectFormat = row.objectFormat === 'sha1' ? 'sha1' : 'sha256'
  const headOid = importOid(row.headOid)
  if (headOid.length !== (objectFormat === 'sha1' ? 40 : 64))
    throw new ImportContractError()
  const bundleObjectId = importNullableText(row.bundleObjectId)
  return {
    version: 1,
    sourceFingerprint: importHash(row.sourceFingerprint),
    localWorkspaceId: importText(row.localWorkspaceId),
    repository: importRepositoryName(row.repository),
    branch: importBranch(row.branch),
    headOid,
    objectFormat,
    bundleObjectId,
    recordCount: importInteger(row.recordCount),
    objectCount: importInteger(row.objectCount),
    partCount: importInteger(row.partCount),
    sessionCount: importInteger(row.sessionCount),
    storedBytes: importInteger(row.storedBytes),
    restoredBytes: importInteger(row.restoredBytes),
    gitDisk: readImportGitDisk(row.gitDisk, objectFormat, bundleObjectId),
  }
}

export function readImportPart(value: unknown): ImportPart {
  const row = importObject(value)
  if (row.group !== 'work' && row.group !== 'document')
    throw new ImportContractError()
  return {
    group: row.group,
    id: importText(row.id),
    sizeBytes: importInteger(row.sizeBytes),
    sha256: importHash(row.sha256),
  }
}

export function readImportManifestEntry(value: unknown): ImportManifestEntry {
  const row = importObject(value)
  if (row.kind === 'object') {
    const purpose = row.purpose
    const encoding = row.encoding
    if (
      (purpose !== 'bundle' &&
        purpose !== 'file' &&
        purpose !== 'memory' &&
        purpose !== 'document') ||
      (encoding !== 'identity' && encoding !== 'zstd') ||
      (encoding === 'zstd' && purpose !== 'memory')
    )
      throw new ImportContractError()
    const partCount = importInteger(row.partCount)
    if (partCount === 0) throw new ImportContractError()
    return {
      kind: 'object',
      id: importText(row.id),
      purpose,
      encoding,
      sizeBytes: importInteger(row.sizeBytes),
      restoredBytes: importInteger(row.restoredBytes),
      partCount,
    }
  }
  if (row.kind === 'part')
    return {
      kind: 'part',
      objectId: importText(row.objectId),
      index: importInteger(row.index),
      part: readImportPart(row.part),
    }
  if (row.kind === 'session') {
    if (row.agent !== 'claude' && row.agent !== 'codex')
      throw new ImportContractError()
    const nativeId = importNativeId(row.nativeId)
    const nativePath = importPath(row.nativePath)
    if (
      row.agent === 'claude'
        ? nativePath !== `${nativeId}.jsonl`
        : !/^sessions\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\/rollout-[^/]+\.jsonl$/.test(
            nativePath,
          ) || !nativePath.endsWith(`-${nativeId}.jsonl`)
    )
      throw new ImportContractError()
    return {
      kind: 'session',
      id: importText(row.id),
      title: importNullableText(row.title),
      agent: row.agent,
      model: importNullableText(row.model),
      messageCount: importInteger(row.messageCount),
      occurredAt:
        row.occurredAt === null ? null : importInteger(row.occurredAt),
      nativeId,
      nativePath,
      memoryObjectId: importText(row.memoryObjectId),
      documentObjectId: importText(row.documentObjectId),
    }
  }
  if (row.kind === 'prerequisite')
    return {
      kind: 'prerequisite',
      oid: importOid(row.oid),
      receiptId: importText(row.receiptId),
    }
  const path = importPath(row.path)
  if (row.kind === 'file') {
    if (row.mode !== '100644' && row.mode !== '100755')
      throw new ImportContractError()
    return {
      kind: 'file',
      path,
      mode: row.mode,
      objectId: importText(row.objectId),
    }
  }
  if (row.kind === 'directory') {
    const mode = importInteger(row.mode)
    if (mode > 0o777) throw new ImportContractError()
    return { kind: 'directory', path, mode }
  }
  if (row.kind === 'symlink')
    return { kind: 'symlink', path, target: importText(row.target) }
  if (row.kind === 'delete') return { kind: 'delete', path }
  throw new ImportContractError()
}
