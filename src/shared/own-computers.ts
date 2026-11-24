import { orgPath } from './api'
import type { ComputerResources } from './generated/ComputerResources'

export const OWN_COMPUTER_INSTALL_PATH = '/install-computer'

export function ownComputersPath(orgId: string): string {
  return `${orgPath(orgId)}/own-computers`
}

export function ownComputerPath(orgId: string, computerId: string): string {
  return `${ownComputersPath(orgId)}/${encodeURIComponent(computerId)}`
}

export function ownComputerCodePath(orgId: string, computerId: string): string {
  return `${ownComputerPath(orgId, computerId)}/code`
}

export function ownComputerBuildsPath(
  orgId: string,
  computerId: string,
): string {
  return `${ownComputerPath(orgId, computerId)}/builds`
}

type OwnComputerConnection =
  | { kind: 'waiting'; codeExpiresAt: number; codeAvailable: boolean }
  | { kind: 'expired' }
  | { kind: 'offline'; lastSeenAt: number }
  | { kind: 'connected' }

export interface OwnComputerRecord {
  id: string
  name: string
  connection: OwnComputerConnection
  limit: number | null
  defaultLimit: number | null
  resources: ComputerResources | null
  runningWorkspaces: number
  workspaces: number
  buildRequestedAt: number | null
  addedAt: number
}

export interface AddOwnComputerRequest {
  name: string
}

export interface OwnComputerLimitRequest {
  limit: number
}

export interface OwnComputersResponse {
  computers: readonly OwnComputerRecord[]
}

export interface OwnComputerResponse {
  computer: OwnComputerRecord
}

export interface OwnComputerCodeResponse {
  code: string
  expiresAt: number
}

export type AddOwnComputerResponse = OwnComputerResponse &
  OwnComputerCodeResponse
