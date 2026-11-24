import type { OwnComputerRecord } from '../../src/shared/own-computers'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { ownComputerClient } from './client'
import { defaultComputerLimit } from './connection-data'
import { listComputers, readComputer, type ComputerRow } from './data'
import { computerNotFound, type ComputerOwner } from './identity'

export async function requireComputer(db: D1Database, owner: ComputerOwner) {
  const computer = await readComputer(db, owner)
  if (!computer) throw computerNotFound()
  return computer
}

export async function listComputerViews(
  env: AppEnv,
  orgId: string,
  now: number,
) {
  const rows = await listComputers(env.DB, orgId)
  const computers = await Promise.all(
    rows.map(async (row) => {
      try {
        return await computerView(env, row, now)
      } catch (error) {
        if (
          error instanceof HttpError &&
          error.code === 'own_computer_not_found'
        )
          return null
        throw error
      }
    }),
  )
  return computers.filter((row) => row !== null)
}

async function computerConnection(
  env: AppEnv,
  row: ComputerRow,
  now: number,
): Promise<OwnComputerRecord['connection']> {
  if (row.connectedAt === null) {
    if (row.codeExpiresAt !== null && row.codeExpiresAt > now)
      return {
        kind: 'waiting',
        codeExpiresAt: row.codeExpiresAt,
        codeAvailable: row.hasCode === 1,
      }
    return { kind: 'expired' }
  }

  const { connected } = await ownComputerClient(env, {
    orgId: row.orgId,
    computerId: row.id,
  }).connection()
  return connected
    ? { kind: 'connected' }
    : { kind: 'offline', lastSeenAt: row.lastSeenAt ?? row.connectedAt }
}

export async function computerView(
  env: AppEnv,
  row: ComputerRow,
  now: number,
): Promise<OwnComputerRecord> {
  const resources =
    row.cpus !== null && row.memoryBytes !== null && row.system !== null
      ? { cpus: row.cpus, memoryBytes: row.memoryBytes, system: row.system }
      : null
  return {
    id: row.id,
    name: row.name,
    connection: await computerConnection(env, row, now),
    resources,
    limit: row.limit,
    defaultLimit: resources && defaultComputerLimit(resources),
    runningWorkspaces: row.runningWorkspaces,
    workspaces: row.workspaces,
    buildRequestedAt: row.buildRequestedAt,
    addedAt: row.addedAt,
  }
}
