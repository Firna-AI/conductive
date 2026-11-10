import type {
  ImportControlResult,
  ImportDeviceEvent,
} from '../../src/shared/conductor-import-operation.ts'
import { readImportSnapshot } from '../../src/shared/conductor-import-manifest-read.ts'
import { readImportDeviceEvent } from '../../src/shared/conductor-import-operation-read.ts'
import {
  IMPORT_PART_BYTES,
  importWire,
} from '../../src/shared/conductor-import-pages.ts'
import type {
  ConductorImportStorage,
  ImportStorageScope,
} from '../../src/shared/conductor-import-storage.ts'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import {
  importRepository,
  githubRepositoryName,
  importUnavailable,
  requireImportAccess,
  type ImportActor,
} from './access'
import {
  createReservation,
  readReservation,
  reservationView,
  type ReservationRow,
} from './reservation-data'
import { closeManifest } from './manifest-validation'
import { storeManifestPage, storeSnapshot } from './manifest-data'
import { checkedMissingPart, importPartOperation } from './part-service'
import { createR2ImportStorage } from './r2-storage'
import { completeReservation } from './publication'
import { currentRepositoryFacts, verifyPrerequisites } from './repository-facts'
import { requestImportCleanup } from './cleanup-data'
import { runImportCleanup } from './cleanup-service'
import { recoverImportWrite } from './write-recovery'

export class ImportReservationService {
  private tail: Promise<unknown> = Promise.resolve()
  private recovered = false
  readonly scope: ImportStorageScope
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly storage: ConductorImportStorage
  private readonly schedule: (when: number | null) => Promise<void>

  constructor(
    env: AppEnv,
    scope: ImportStorageScope,
    dependencies: AppDependencies,
    schedule: (when: number | null) => Promise<void> = async () => undefined,
    storage = createR2ImportStorage(
      env,
      scope,
      { maxPartBytes: IMPORT_PART_BYTES, maxReadBytes: IMPORT_PART_BYTES },
      { now: dependencies.now, newId: dependencies.randomToken },
    ),
  ) {
    this.env = env
    this.scope = scope
    this.dependencies = dependencies
    this.schedule = schedule
    this.storage = storage
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const pending = this.tail.then(work)
    this.tail = pending.catch(() => undefined)
    return pending
  }

  private async recover() {
    if (this.recovered) return
    await recoverImportWrite(this.env.DB, this.scope, this.storage)
    this.recovered = true
  }

  async control(
    actor: ImportActor,
    event: ImportDeviceEvent,
  ): Promise<ImportControlResult> {
    importWire(event)
    event = readImportDeviceEvent(event)
    return this.serial(async () => {
      try {
        await requireImportAccess(this.env.DB, actor, this.dependencies.now())
        if (actor.orgId !== this.scope.orgId) throw importUnavailable()
        await this.recover()
        const result = await this.apply(actor, event)
        await this.reservation(
          actor,
          result.kind === 'reservation'
            ? result.reservation.id
            : this.scope.reservationId,
        )
        await requireImportAccess(this.env.DB, actor, this.dependencies.now())
        return result
      } catch (error) {
        this.recovered = false
        throw error
      }
    })
  }

  private async reservation(
    actor: ImportActor,
    id = this.scope.reservationId,
  ): Promise<ReservationRow> {
    const row = await readReservation(this.env.DB, id)
    if (
      !row ||
      row.orgId !== actor.orgId ||
      row.importerUserId !== actor.userId
    )
      throw importUnavailable()
    if (row.state === 'open' && row.expiresAt <= this.dependencies.now()) {
      await requestImportCleanup(
        this.env.DB,
        row.id,
        'all',
        this.dependencies.now(),
      )
      await this.schedule(this.dependencies.now())
      throw new HttpError(
        409,
        'import_expired',
        'The unfinished import expired. Scan again.',
      )
    }
    if (row.state !== 'open' && row.state !== 'complete')
      throw importUnavailable()
    const repository = await importRepository(
      this.env.DB,
      actor,
      {
        localWorkspaceId: row.localWorkspaceId,
        name: row.name,
        repository: await this.repositoryName(row.repositoryId),
        branch: row.branch,
        sessionCount: 0,
        uploadBytes: 0,
      },
      this.dependencies.now(),
    )
    if (repository?.id !== row.repositoryId) throw importUnavailable()
    return row
  }

  private async repositoryName(id: string) {
    return (
      (await this.env.DB.prepare(
        'SELECT full_name FROM repositories WHERE id = ? AND org_id = ?',
      )
        .bind(id, this.scope.orgId)
        .first<string>('full_name')) ?? ''
    )
  }

  private async apply(
    actor: ImportActor,
    event: ImportDeviceEvent,
  ): Promise<ImportControlResult> {
    const { DB: db } = this.env
    const now = this.dependencies.now()
    const id = this.scope.reservationId
    if (event.kind === 'reserve') {
      if (event.row.branch === null) throw importUnavailable()
      const repository = await importRepository(db, actor, event.row, now)
      if (!repository) throw importUnavailable()
      const row = await createReservation(
        db,
        actor,
        id,
        repository.id,
        event.row,
        now,
        event.replace,
      )
      if (!row || row.importerUserId !== actor.userId) throw importUnavailable()
      if (event.replace && row.id !== id) throw importUnavailable()
      await this.schedule(row.expiresAt)
      return { kind: 'reservation', reservation: reservationView(row) }
    }
    if (!('reservationId' in event) || event.reservationId !== id)
      throw importUnavailable()
    const row = await this.reservation(actor)
    if (event.kind === 'progress')
      return { kind: 'reservation', reservation: reservationView(row) }
    if (event.kind === 'complete')
      return {
        kind: 'complete',
        workspaceId: await completeReservation(this.env, actor, row, now),
      }
    if (row.state !== 'open') throw importUnavailable()
    if (event.kind === 'repository.facts')
      return {
        kind: 'repository.facts',
        facts: await currentRepositoryFacts(
          this.env,
          actor,
          row,
          this.dependencies,
        ),
      }
    if (event.kind === 'repository.prerequisites')
      return {
        kind: 'repository.prerequisites',
        ...(await verifyPrerequisites(
          this.env,
          actor,
          row,
          this.dependencies,
          event,
        )),
      }
    if (event.kind === 'snapshot') {
      if (
        event.snapshot.localWorkspaceId !== row.localWorkspaceId ||
        event.snapshot.branch !== row.branch ||
        githubRepositoryName(event.snapshot.repository) !==
          githubRepositoryName(await this.repositoryName(row.repositoryId))
      )
        throw importUnavailable()
      await storeSnapshot(db, actor, id, event.snapshot, now)
    } else if (event.kind === 'manifest')
      await storeManifestPage(db, actor, id, event.offset, event.entries, now)
    else if (event.kind === 'manifest.end') {
      if (!row.snapshotJson) throw importUnavailable()
      await closeManifest(
        db,
        actor,
        id,
        readImportSnapshot(JSON.parse(row.snapshotJson)),
        now,
      )
    } else if (event.kind === 'missing') {
      if (!row.manifestClosed) throw importUnavailable()
      return checkedMissingPart(
        db,
        this.storage,
        actor,
        id,
        event.cursor,
        this.dependencies.now,
      )
    } else if (event.kind === 'target' || event.kind === 'verify') {
      if (!row.manifestClosed) throw importUnavailable()
      const result = await importPartOperation(
        db,
        this.storage,
        actor,
        id,
        event,
        this.dependencies.now,
      )
      await this.reservation(actor)
      return result
    } else throw importUnavailable()
    return { kind: 'accepted' }
  }

  async cleanup(group?: 'work' | 'all'): Promise<boolean> {
    if (group)
      await requestImportCleanup(
        this.env.DB,
        this.scope.reservationId,
        group,
        this.dependencies.now(),
      )
    return this.serial(async () => {
      await this.recover()
      return runImportCleanup(
        this.env.DB,
        this.scope,
        this.storage,
        this.dependencies.now,
        this.schedule,
      )
    })
  }
}
