import type {
  ImportManifestEntry,
  ImportSnapshot,
} from '../../src/shared/conductor-import-manifest.ts'
import { TEST_TIME } from '../test-support/harness'
import { partFor } from './storage.test-support'

export const SOURCE_HEAD = 'a'.repeat(40)
export const SOURCE_HASH = 'b'.repeat(64)
const encoder = new TextEncoder()
export const BYTES = {
  bundle: encoder.encode('bundle'),
  code: encoder.encode('code'),
  memory: encoder.encode('native'),
  first: encoder.encode('first\n'),
  second: encoder.encode('second\n'),
}
export const PARTS = [
  partFor(BYTES.bundle, 'bundle'),
  partFor(BYTES.code, 'code'),
  partFor(BYTES.memory, 'memory'),
  partFor(BYTES.first, 'first', 'document'),
  partFor(BYTES.second, 'second', 'document'),
]
export const SNAPSHOT: ImportSnapshot = {
  version: 1,
  sourceFingerprint: SOURCE_HASH,
  headOid: SOURCE_HEAD,
  objectFormat: 'sha1',
  bundleObjectId: 'bundle',
  localWorkspaceId: 'local-source',
  repository: 'example/repository',
  branch: 'owner/work',
  recordCount: 15,
  objectCount: 4,
  partCount: 5,
  sessionCount: 1,
  storedBytes: 29,
  restoredBytes: 29,
  gitDisk: {
    version: 1,
    treeOid: 'cccccccccccccccccccccccccccccccccccccccc',
    reconstruction: {
      objectCount: 4,
      inflatedBytes: 16384,
      maxObjectBytes: 8192,
    },
    checkout: {
      fileCount: 3,
      fileBytes: 4352,
      directoryCount: 2,
      symlinkCount: 1,
      symlinkBytes: 9,
      pathBytes: 73,
    },
    lfs: {
      cacheObjectCount: 1,
      cacheBytes: 8192,
      checkoutPathCount: 2,
      checkoutBytes: 16384,
    },
  },
}
export const ENTRIES: ImportManifestEntry[] = [
  {
    kind: 'object',
    id: 'bundle',
    purpose: 'bundle',
    encoding: 'identity',
    sizeBytes: 6,
    restoredBytes: 6,
    partCount: 1,
  },
  {
    kind: 'object',
    id: 'code',
    purpose: 'file',
    encoding: 'identity',
    sizeBytes: 4,
    restoredBytes: 4,
    partCount: 1,
  },
  {
    kind: 'object',
    id: 'memory',
    purpose: 'memory',
    encoding: 'identity',
    sizeBytes: 6,
    restoredBytes: 6,
    partCount: 1,
  },
  {
    kind: 'object',
    id: 'document',
    purpose: 'document',
    encoding: 'identity',
    sizeBytes: 13,
    restoredBytes: 13,
    partCount: 2,
  },
  ...PARTS.map((part, index): ImportManifestEntry => ({
    kind: 'part',
    objectId: index < 3 ? part.id : 'document',
    index: index < 4 ? 0 : 1,
    part,
  })),
  {
    kind: 'session',
    id: 'old-session',
    title: 'Old work',
    agent: 'codex',
    model: 'old-model',
    messageCount: 2,
    occurredAt: TEST_TIME - 1,
    nativeId: 'native-test-id',
    nativePath: 'sessions/2026/11/10/rollout-native-test-id.jsonl',
    memoryObjectId: 'memory',
    documentObjectId: 'document',
  },
  { kind: 'file', path: 'src/run.sh', mode: '100755', objectId: 'code' },
  {
    kind: 'file',
    path: '.context/notes.txt',
    mode: '100644',
    objectId: 'code',
  },
  { kind: 'directory', path: '.context', mode: 0o755 },
  { kind: 'symlink', path: 'link', target: '/outside/exact-target' },
  { kind: 'delete', path: 'gone.txt' },
]
