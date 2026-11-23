import type {
  SecretRequest,
  WorkspaceSecretValue,
} from '../../src/shared/secret-requests'
import type { ChatData } from '../chat/types'
import { record, string, strings, number } from '../chat/inputs'
import {
  readSecretRequest,
  readWorkspaceSecretValue,
} from '../../src/shared/secret-requests-read'
import {
  saveSecretRecord,
  readSecretRecord,
  deleteSecretRecord,
} from './request-storage'

const ROOT = 'secrets:v1:'

export interface StoredSecretRequest {
  request: SecretRequest
  names: readonly string[]
  tokenHash: string
  orgId: string
  lateAnswer?: boolean
}

export interface TemporarySecret extends WorkspaceSecretValue {
  ciphertext: string
  sessionId: string | null
  expiresAt: number | null
}

/** Records and browser events commit in the same chat transaction. */
export class SecretRequestRecords {
  private readonly data: ChatData
  constructor(data: ChatData) {
    this.data = data
  }

  private async keys(prefix: string): Promise<string[]> {
    const keys: string[] = []
    let startAfter: string | undefined
    for (;;) {
      const page = await this.data.list({
        prefix,
        ...(startAfter === undefined ? {} : { startAfter }),
      })
      if (!page.size) return keys
      for (const key of page.keys()) {
        keys.push(key)
        startAfter = key
      }
    }
  }

  async requests(): Promise<StoredSecretRequest[]> {
    const requests: StoredSecretRequest[] = []
    for (const key of await this.keys(`${ROOT}request:`)) {
      const value = await this.request(key.slice(`${ROOT}request:`.length))
      if (value) requests.push(value)
    }
    return requests
  }

  async request(id: string): Promise<StoredSecretRequest | undefined> {
    const value = await readSecretRecord(this.data, `${ROOT}request:${id}`)
    if (value === undefined) return undefined
    const item = record(value)
    return {
      request: readSecretRequest(item.request),
      names: strings(item.names),
      tokenHash: string(item.tokenHash),
      orgId: string(item.orgId),
      lateAnswer: item.lateAnswer === true,
    }
  }

  save(record: StoredSecretRequest) {
    return saveSecretRecord(
      this.data,
      `${ROOT}request:${record.request.id}`,
      record,
    )
  }

  async temporary(now: number): Promise<TemporarySecret[]> {
    return (await this.values()).filter(
      (value) => value.expiresAt === null || value.expiresAt > now,
    )
  }

  async workspaceValueNames(): Promise<string[]> {
    const names: string[] = []
    for (const key of await this.keys(`${ROOT}value:`)) {
      const item = record(await readSecretRecord(this.data, key))
      if (item.sessionId === null && item.expiresAt === null)
        names.push(string(item.name))
    }
    return names
  }

  async workspaceValueName(id: string): Promise<string | null> {
    const value = await readSecretRecord(this.data, `${ROOT}value:${id}`)
    if (value === undefined) return null
    const item = record(value)
    return item.sessionId === null && item.expiresAt === null
      ? string(item.name)
      : null
  }

  async values(): Promise<TemporarySecret[]> {
    const values: TemporarySecret[] = []
    for (const key of await this.keys(`${ROOT}value:`)) {
      const item = record(await readSecretRecord(this.data, key))
      values.push({
        ...readWorkspaceSecretValue(item),
        ciphertext: string(item.ciphertext),
        sessionId: item.sessionId === null ? null : string(item.sessionId),
        expiresAt: item.expiresAt === null ? null : number(item.expiresAt),
      })
    }
    return values
  }

  saveValue(value: TemporarySecret) {
    return saveSecretRecord(this.data, `${ROOT}value:${value.id}`, value)
  }

  async removeValue(id: string) {
    await deleteSecretRecord(this.data, `${ROOT}value:${id}`)
  }

  async expire(now: number, archived = false) {
    let changed = false
    for (const value of await this.values())
      if (archived || (value.expiresAt !== null && value.expiresAt <= now)) {
        await this.removeValue(value.id)
        changed = true
      }
    return changed
  }

  async used(): Promise<string[]> {
    const value = await readSecretRecord(this.data, `${ROOT}used`)
    return value === undefined ? [] : strings(value)
  }

  async use(ids: readonly string[]) {
    await saveSecretRecord(this.data, `${ROOT}used`, [
      ...new Set([...(await this.used()), ...ids]),
    ])
  }
}

export function temporaryValueContext(workspaceId: string, id: string) {
  return JSON.stringify(['workspace-secret-value', workspaceId, id])
}

export function openSecretRequest(request: SecretRequest) {
  return request.state === 'waiting' || request.state === 'late'
}
