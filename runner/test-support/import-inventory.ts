import { zstdCompressSync } from 'node:zlib'

import type { ImportManifestEntry } from '../../src/shared/conductor-import-manifest'
import { importDigest } from '../src/import-storage'

export function importInventory() {
  const nativeClaude = Buffer.from(
    '{"type":"user","uuid":"user-1","message":{"role":"user","content":"Earlier user"}}\n{"type":"assistant","message":{"content":[{"type":"text","text":"Earlier answer"}]}}\n',
  )
  const header =
    '{ "type": "session_meta", "payload": { "id": "codex-native", "model_provider": "openai", "cwd": "/source" }, "payload.model_provider": "openai", "extra": {"model_provider":"openai"} }\r\n'
  const items =
    '{"type":"response_item","payload":{"type":"message","content":"original"}}\n'
  const nativeCodex = Buffer.from(header + items)
  const values: Record<string, Buffer> = {
    code: Buffer.from('\ufeffexact\u0000source\n'),
    claude: nativeClaude,
    codex: zstdCompressSync(nativeCodex),
    document: Buffer.from('# Earlier work\n\nKept document.\n'),
  }
  const entries: ImportManifestEntry[] = Object.entries(values).flatMap(
    ([id, bytes]): ImportManifestEntry[] => [
      {
        kind: 'object',
        id,
        purpose:
          id === 'code' ? 'file' : id === 'document' ? 'document' : 'memory',
        encoding: id === 'codex' ? 'zstd' : 'identity',
        sizeBytes: bytes.length,
        restoredBytes: id === 'codex' ? nativeCodex.length : bytes.length,
        partCount: 1,
      },
      {
        kind: 'part',
        objectId: id,
        index: 0,
        part: {
          id,
          group: id === 'document' ? 'document' : 'work',
          sizeBytes: bytes.length,
          sha256: importDigest(bytes),
        },
      },
    ],
  )
  entries.push(
    { kind: 'file', path: 'foo', mode: '100755', objectId: 'code' },
    { kind: 'directory', path: '.context', mode: 0o755 },
    { kind: 'directory', path: '.context/empty', mode: 0o700 },
    {
      kind: 'file',
      path: '.context/notes.txt',
      mode: '100644',
      objectId: 'code',
    },
    { kind: 'symlink', path: 'link', target: '../outside' },
    { kind: 'delete', path: 'gone.txt' },
    ...(['claude', 'codex'] as const).map((agent): ImportManifestEntry => ({
      kind: 'session',
      id: `${agent}-document`,
      title: 'Earlier work',
      agent,
      model: null,
      messageCount: 2,
      occurredAt: 1,
      nativeId: `${agent}-native`,
      nativePath:
        agent === 'claude'
          ? 'claude-native.jsonl'
          : 'sessions/2026/11/10/rollout-codex-native.jsonl',
      memoryObjectId: agent,
      documentObjectId: 'document',
    })),
  )
  return {
    values,
    entries,
    nativeClaude,
    nativeCodex,
    expectedCodex: Buffer.from(
      header.replace(
        '"model_provider": "openai"',
        '"model_provider": "conductive"',
      ) + items,
    ),
  }
}
