import { join, relative } from 'node:path'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import { readImportSnapshot } from '../../../src/shared/conductor-import-manifest-read.ts'
import { measureGitDisk } from './disk.ts'
import { buildBundle } from './package-git.ts'
import { availableLfsFiles } from './package-lfs.ts'
import { PackageObjects } from './objects.ts'
import { convertNative, inspectNative } from './native.ts'
import { digest, FILE_LIMIT_BYTES } from './safe-files.ts'
import { capturedFile, capturedNative } from './stage-state.ts'
import type { StageSource } from './stage-state.ts'
import type { ImportLocations, ImportStage } from './types.ts'
import { LocalImportError } from './types.ts'

export async function packageStage(
  locations: ImportLocations,
  directory: string,
  output: string,
  prepared: StageSource,
  facts: ImportRepositoryFacts,
  exclusions: string[] | undefined,
  signal: AbortSignal,
): Promise<{
  stage: ImportStage
  exclusions: string[]
  omittedFiles: { path: string; sizeBytes: number }[]
}> {
  const source = prepared.source
  if (
    facts.fullName.toLowerCase() !== source.workspace.row.repository ||
    facts.branch !== source.branch
  )
    throw new LocalImportError('source_changed')
  const bundle = await buildBundle(
    directory,
    output,
    source,
    facts,
    exclusions,
    signal,
  )
  const gitDisk = await measureGitDisk(
    directory,
    output,
    source,
    bundle.path,
    signal,
  )
  const githubFiles = await availableLfsFiles(
    directory,
    source,
    facts.id,
    signal,
  )
  const omittedFiles = source.files
    .filter(
      (file) =>
        file.kind === 'file' &&
        file.size > FILE_LIMIT_BYTES &&
        !githubFiles.has(file.path),
    )
    .map((file) => ({ path: file.path, sizeBytes: file.size }))
  const objects = await PackageObjects.create(output)
  let bundleObjectId: string | null = null
  try {
    if (bundle.path)
      bundleObjectId = await objects.object(
        bundle.path,
        'bundle',
        'identity',
        undefined,
        signal,
      )
    for (const [index, file] of source.files.entries()) {
      signal.throwIfAborted()
      if (file.kind === 'file') {
        if (githubFiles.has(file.path)) continue
        if (file.size > FILE_LIMIT_BYTES) continue
        const objectId = await objects.object(
          capturedFile(directory, index),
          'file',
          'identity',
          undefined,
          signal,
        )
        await objects.entry({
          kind: 'file',
          path: file.path,
          mode: file.mode & 0o111 ? '100755' : '100644',
          objectId,
        })
      } else if (file.kind === 'directory')
        await objects.entry({
          kind: 'directory',
          path: file.path,
          mode: file.mode,
        })
      else if (file.kind === 'symlink') {
        if (file.target === undefined) throw new LocalImportError('read_failed')
        await objects.entry({
          kind: 'symlink',
          path: file.path,
          target: file.target,
        })
      } else await objects.entry({ kind: 'delete', path: file.path })
    }
    for (const [index, memory] of source.native.entries()) {
      signal.throwIfAborted()
      const { session } = memory
      if (!memory.path || !session.agent || !session.nativeId) continue
      const native = capturedNative(directory, index, memory.path)
      const metadata = await inspectNative(native, signal)
      const document = join(output, `document-${index}.md`)
      const converted = await convertNative(
        native,
        document,
        session.agent,
        signal,
      )
      const memoryObjectId = await objects.object(
        native,
        'memory',
        metadata.encoding,
        converted.restoredBytes,
        signal,
      )
      const documentObjectId = await objects.object(
        document,
        'document',
        'identity',
        undefined,
        signal,
      )
      await objects.entry({
        kind: 'session',
        id: session.id,
        title: session.title,
        agent: session.agent,
        model: session.model,
        nativeId: session.nativeId,
        nativePath:
          session.agent === 'claude'
            ? `${session.nativeId}.jsonl`
            : relative(join(locations.home, '.codex'), memory.path).replace(
                /\.zst$/,
                '',
              ),
        messageCount: converted.messageCount,
        occurredAt: converted.occurredAt,
        memoryObjectId,
        documentObjectId,
      })
    }
    const totals = objects.totals
    const snapshot = readImportSnapshot({
      version: 1,
      sourceFingerprint: digest({
        sourceDigest: source.digest,
        gitDisk,
        exclusions: bundle.exclusions,
        candidates: bundle.candidates,
        inventory: objects.inventory.digest('hex'),
      }),
      localWorkspaceId: source.workspace.row.localWorkspaceId,
      repository: source.workspace.row.repository,
      branch: source.branch,
      headOid: source.headOid,
      objectFormat: source.objectFormat,
      bundleObjectId,
      recordCount: totals.records + bundle.candidates.length,
      objectCount: totals.objects,
      partCount: totals.parts,
      sessionCount: totals.sessions,
      storedBytes: totals.stored,
      restoredBytes: totals.restored,
      gitDisk,
    })
    return {
      exclusions: bundle.exclusions,
      omittedFiles,
      stage: {
        id: prepared.id,
        sourceDigest: source.digest,
        row: {
          ...source.workspace.row,
          branch: source.branch,
          uploadBytes: totals.stored,
        },
        headOid: source.headOid,
        candidates: bundle.candidates,
        snapshot,
      },
    }
  } finally {
    await objects.close()
  }
}
