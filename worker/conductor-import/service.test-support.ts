import type {
  ImportDeviceEvent,
  ImportScanRow,
} from '../../src/shared/conductor-import-operation.ts'
import type { ImportUploadTarget } from '../../src/shared/conductor-import-storage.ts'
import type { AppEnv } from '../env'
import { seedBackend } from '../lifecycle/backend-seed.test-support'
import type { TestHarness } from '../test-support/harness'
import { TEST_TIME } from '../test-support/harness'
import { createApp } from '../application'
import type { ImportActor } from './access'
import { ImportReservationService } from './service'
import { temporaryKey } from './storage.test-support'
import {
  SOURCE_HASH,
  SNAPSHOT,
  ENTRIES,
  PARTS,
  BYTES,
} from './manifest.test-support'

export async function importFixture(harness: TestHarness) {
  const seed = await seedBackend(harness)
  const db = harness.env.DB
  await db
    .prepare(
      `INSERT INTO repositories (id,org_id,github_repository_id,full_name,default_branch)
    VALUES ('import-repo',?,17,'example/repository','main')`,
    )
    .bind(seed.org.id)
    .run()
  const session = await db
    .prepare('SELECT id FROM sessions WHERE user_id = ?')
    .bind(seed.user.id)
    .first<{ id: string }>()
  if (!session) throw new Error('Missing test session.')
  const actor: ImportActor = {
    orgId: seed.org.id,
    userId: seed.user.id,
    sessionId: session.id,
  }
  let now = TEST_TIME
  let sequence = 0
  const env: AppEnv = {
    ...harness.env,
    WORKSPACES: harness.native.bindings.WORKSPACES,
    CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({
      agent: 'codex',
      model: 'test-model',
      effort: 'high',
    }),
    CHAT_ATTACHMENTS_S3_BUCKET_URL:
      'https://example.r2.cloudflarestorage.com/private-bucket',
    CHAT_ATTACHMENTS_ACCESS_KEY_ID: 'test-access',
    CHAT_ATTACHMENTS_SECRET_ACCESS_KEY: 'test-secret',
  }
  const dependencies = {
    now: () => now,
    randomToken: () => `upload-${++sequence}`,
    fetch: harness.github.fetch,
  }
  const source: ImportScanRow = {
    localWorkspaceId: 'local-source',
    name: 'Transferred work',
    repository: 'https://github.com/example/repository.git',
    branch: 'owner/work',
    sessionCount: 1,
    uploadBytes: 29,
  }
  const make = (id = 'reservation', overrides: Partial<AppEnv> = {}) =>
    new ImportReservationService(
      { ...env, ...overrides },
      { orgId: actor.orgId, reservationId: id },
      dependencies,
    )
  const service = make()
  const control = (event: ImportDeviceEvent) => service.control(actor, event)
  const prepare = async (
    id = 'reservation',
    selected = make(id),
    fingerprint = SOURCE_HASH,
  ) => {
    await selected.control(actor, { kind: 'reserve', row: source })
    await selected.control(actor, {
      kind: 'snapshot',
      reservationId: id,
      snapshot: { ...SNAPSHOT, sourceFingerprint: fingerprint },
    })
    await selected.control(actor, {
      kind: 'manifest',
      reservationId: id,
      offset: 0,
      entries: ENTRIES,
    })
    await selected.control(actor, { kind: 'manifest.end', reservationId: id })
  }
  const upload = async (
    partId: string,
    selected = service,
    id = 'reservation',
    bytes?: Uint8Array,
  ): Promise<ImportUploadTarget> => {
    const target = await selected.control(actor, {
      kind: 'target',
      reservationId: id,
      partId,
    })
    if (target.kind !== 'target') throw new Error('Missing upload target.')
    const partIndex = PARTS.findIndex((part) => part.id === partId)
    const data = bytes ?? Object.values(BYTES)[partIndex]
    if (!data || !env.CHAT_ATTACHMENTS)
      throw new Error('Missing local upload bytes.')
    await env.CHAT_ATTACHMENTS.put(temporaryKey(target.target), data)
    return target.target
  }
  const verifyAll = async (selected = service, id = 'reservation') => {
    for (const part of PARTS) {
      await upload(part.id, selected, id)
      await selected.control(actor, {
        kind: 'verify',
        reservationId: id,
        partId: part.id,
      })
    }
  }
  const missing = async (selected = service, id = 'reservation') => {
    const parts = []
    let cursor: number | null = 0
    while (cursor !== null) {
      const page = await selected.control(actor, {
        kind: 'missing',
        reservationId: id,
        cursor,
      })
      if (page.kind !== 'missing') throw new Error('Missing retry inventory.')
      parts.push(...page.parts)
      cursor = page.nextCursor
    }
    return parts
  }
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    sessionCookie = seed.session,
  ) =>
    createApp(dependencies).fetch(
      new Request(env.APP_ORIGIN + path, {
        method,
        headers: {
          Cookie: sessionCookie,
          Origin: env.APP_ORIGIN,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    )
  return {
    ...seed,
    harness,
    env,
    db,
    actor,
    source,
    service,
    make,
    control,
    prepare,
    upload,
    verifyAll,
    missing,
    request,
    dependencies,
    setTime: async (at: number) => {
      now = at
      harness.setTime(at)
      await harness.native.setTime(at)
    },
  }
}

export type ImportFixture = Awaited<ReturnType<typeof importFixture>>
