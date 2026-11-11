import type { AgentLoginKind } from '../chat/login-kind'
import { base64Url } from '../security/crypto'

export interface TurnTokenState {
  nonce: string
  loginVersion: number
}

export interface TurnTokenRoute {
  workspaceId: string
  turnId: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

function nativeTokenPrefix(login: AgentLoginKind): string {
  if (login.agent === 'codex') return 'sk-'
  return login.kind === 'token' ? 'sk-ant-oat01-' : 'sk-ant-api-'
}

function tokenPrefix(token: string): string {
  return (
    ['sk-ant-api-', 'sk-ant-oat01-', 'sk-'].find((prefix) =>
      token.startsWith(prefix),
    ) ?? ''
  )
}

export function turnTokenMatchesKind(
  token: string,
  login: AgentLoginKind,
): boolean {
  return tokenPrefix(token) === nativeTokenPrefix(login)
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (character) => character.charCodeAt(0),
  )
}

function routingPart(route: TurnTokenRoute): string {
  return base64Url(
    encoder.encode(JSON.stringify([route.workspaceId, route.turnId])),
  )
}

export function turnTokenRoute(token: string): TurnTokenRoute | null {
  const [version, routing, signature, extra] = token
    .slice(tokenPrefix(token).length)
    .split('.')
  if (
    version !== 'gt1' ||
    !routing ||
    !signature ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]+$/.test(routing) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    return null
  try {
    const value: unknown = JSON.parse(decoder.decode(decode(routing)))
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== 'string' ||
      !value[0] ||
      typeof value[1] !== 'string' ||
      !value[1]
    )
      return null
    const route = { workspaceId: value[0], turnId: value[1] }
    return routingPart(route) === routing ? route : null
  } catch {
    return null
  }
}

/** Derive a separate HMAC key, so the encryption key never signs directly. */
async function tokenKey(secret: string) {
  const base = await crypto.subtle.importKey(
    'raw',
    decode(secret),
    'HKDF',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: encoder.encode('conductive:model-gateway:turn-token:v1'),
    },
    base,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify'],
  )
}

function tokenInput(
  route: TurnTokenRoute,
  state: TurnTokenState,
  prefix: string,
) {
  return encoder.encode(
    JSON.stringify([
      'conductive:model-gateway:turn:v1',
      routingPart(route),
      state.nonce,
      state.loginVersion,
      prefix,
    ]),
  )
}

export async function deriveTurnToken(
  route: TurnTokenRoute,
  state: TurnTokenState,
  secret: string,
  login: AgentLoginKind,
): Promise<string> {
  const prefix = nativeTokenPrefix(login)
  const signature = await crypto.subtle.sign(
    'HMAC',
    await tokenKey(secret),
    tokenInput(route, state, prefix),
  )
  return `${prefix}gt1.${routingPart(route)}.${base64Url(new Uint8Array(signature))}`
}

export async function verifyTurnToken(
  token: string,
  route: TurnTokenRoute,
  state: TurnTokenState,
  secret: string,
): Promise<boolean> {
  const signature = token.split('.')[2]
  const bytes = decode(signature)
  if (base64Url(bytes) !== signature) return false
  return crypto.subtle.verify(
    'HMAC',
    await tokenKey(secret),
    bytes,
    tokenInput(route, state, tokenPrefix(token)),
  )
}
