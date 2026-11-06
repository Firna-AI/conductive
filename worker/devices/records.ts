import type { DeviceCommandRecord } from '../../src/shared/device'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatStorage } from '../chat/types'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { hash } from '../security/crypto'
import { publishDeviceState } from './state'
import { readDeviceRecord } from '../../src/shared/device-read'
import { readDeviceValue, writeDeviceValue } from './storage'

const RECORDS = 'devices:v1:request:'
const OUTBOX = 'devices:v1:publish:'
const AUTH = 'devices:v1:token:'
export const commandPending = (record: DeviceCommandRecord) =>
  record.state === 'waiting' || record.state === 'running'

/** This queue never spans a call to the device broker. */
export class DeviceRecords {
  private tail: Promise<unknown> = Promise.resolve()
  private readonly storage: ChatStorage
  private readonly chat: WorkspaceChat
  private readonly env: AppEnv
  constructor(storage: ChatStorage, chat: WorkspaceChat, env: AppEnv) {
    this.storage = storage
    this.chat = chat
    this.env = env
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    const task = this.tail.then(work)
    this.tail = task.catch(() => undefined)
    return task
  }
  async get(id: string): Promise<DeviceCommandRecord | undefined> {
    const value = await readDeviceValue(
      this.storage,
      RECORDS + (await hash(id)),
    )
    return value === undefined ? undefined : readDeviceRecord(value)
  }
  async tokenHash(id: string): Promise<string> {
    return (await this.storage.get<string>(AUTH + (await hash(id)))) ?? ''
  }
  async list(): Promise<DeviceCommandRecord[]> {
    const records = await Promise.all(
      [...(await this.storage.list({ prefix: RECORDS })).keys()].map(
        async (key) =>
          readDeviceRecord(await readDeviceValue(this.storage, key)),
      ),
    )
    return records.sort(
      (a, b) =>
        a.createdAt - b.createdAt || a.requestId.localeCompare(b.requestId),
    )
  }
  save(record: DeviceCommandRecord, tokenHash?: string): Promise<void> {
    return this.run(async () => {
      await this.write(record, tokenHash)
    })
  }
  async desktopSession(id: string): Promise<string> {
    return (
      (await this.storage.get<string>(
        'devices:v1:desktop:' + (await hash(id)),
      )) ?? ''
    )
  }
  async dispatched(id: string): Promise<boolean> {
    return (
      (await this.storage.get<boolean>(
        'devices:v1:dispatched:' + (await hash(id)),
      )) === true
    )
  }
  markDispatched(id: string): Promise<boolean> {
    return this.run(async () => {
      if (!commandPending(await this.require(id))) return false
      await this.storage.put('devices:v1:dispatched:' + (await hash(id)), true)
      return true
    })
  }
  create(
    record: DeviceCommandRecord,
    tokenHash: string,
    desktopSession: string,
  ): Promise<DeviceCommandRecord> {
    return this.run(async () => {
      const existing = await this.get(record.requestId)
      if (existing) {
        if (
          [
            'command',
            'folder',
            'reason',
            'timeoutSeconds',
            'longerTimeoutReason',
            'turnId',
            'sessionId',
          ].some(
            (key) => Reflect.get(existing, key) !== Reflect.get(record, key),
          ) ||
          existing.sender.id !== record.sender.id
        )
          throw new HttpError(
            409,
            'device_request_conflict',
            'Send the changed command with a new request ID.',
          )
        await this.flush()
        return existing
      }
      await this.storage.put(
        'devices:v1:desktop:' + (await hash(record.requestId)),
        desktopSession,
      )
      await this.write(record, tokenHash)
      return record
    })
  }
  change(
    id: string,
    update: (record: DeviceCommandRecord) => Promise<DeviceCommandRecord>,
  ): Promise<DeviceCommandRecord> {
    return this.run(async () => {
      const record = await update(await this.require(id))
      await this.write(record)
      return record
    })
  }
  private async write(record: DeviceCommandRecord, tokenHash?: string) {
    const key = await hash(record.requestId)
    await this.storage.transaction(async (data) => {
      await writeDeviceValue(data, RECORDS + key, record)
      await data.put(OUTBOX + key, true)
      if (tokenHash !== undefined) await data.put(AUTH + key, tokenHash)
    })
    await this.flush()
  }
  async flush(): Promise<void> {
    for (const key of (await this.storage.list({ prefix: OUTBOX })).keys()) {
      const value = await readDeviceValue(
        this.storage,
        RECORDS + key.slice(OUTBOX.length),
      )
      const record = value === undefined ? undefined : readDeviceRecord(value)
      if (record) {
        const waiting = (await this.list()).some(
          (item) => item.state === 'waiting',
        )
        await publishDeviceState(
          this.storage,
          this.chat,
          this.env,
          record,
          waiting,
        )
      }
      await this.storage.delete(key)
    }
  }
  async require(id: string): Promise<DeviceCommandRecord> {
    const record = await this.get(id)
    if (!record)
      throw new HttpError(
        404,
        'device_request_not_found',
        'The Mac request is not available.',
      )
    return record
  }
}
