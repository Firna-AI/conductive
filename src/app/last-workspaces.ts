import type { OrgSummary } from '../shared/orgs'
import { parseRoute, routes, type Route } from './router'
import type { KeyValueStorage } from './services'
import { Store, type Readable } from './store'

/** The page of one workspace, as the router reads it from an address. */
export type WorkspaceRoute = Extract<Route, { screen: 'workspace' }>

/**
 * The last workspace that the person opened in each org, with the org of
 * the last one of all. Each address is a workspace address of its org.
 */
export interface LastWorkspaceState {
  readonly latest: string | null
  readonly addresses: ReadonlyMap<string, string>
}

const empty: LastWorkspaceState = { latest: null, addresses: new Map() }

const keyPrefix = 'conductive.last-workspaces.'

/** The address of a workspace page, with its session or its view. */
export function workspaceAddress(route: WorkspaceRoute): string {
  return route.session === undefined
    ? routes.workspace(route.orgId, route.workspaceId, ...route.view)
    : routes.session(route.orgId, route.workspaceId, route.session)
}

/** The workspace page of `address`, when it is one of the org `orgId`. */
function workspaceOf(address: unknown, orgId: string): WorkspaceRoute | null {
  if (typeof address !== 'string' || !address.startsWith('/')) return null
  const route = parseRoute(address, '')
  if (route.screen !== 'workspace' || route.orgId !== orgId) return null
  return route
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads the stored value. It keeps each valid address, and it ignores a
 * bad value, an address of another org, and a refused storage.
 */
function parseState(text: string | null): LastWorkspaceState {
  if (text === null) return empty
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return empty
  }
  if (!isRecord(value) || !isRecord(value.orgs)) return empty
  const addresses = new Map<string, string>()
  for (const [orgId, address] of Object.entries(value.orgs)) {
    const route = workspaceOf(address, orgId)
    if (route) addresses.set(orgId, workspaceAddress(route))
  }
  const latest =
    typeof value.latest === 'string' && addresses.has(value.latest)
      ? value.latest
      : null
  return { latest, addresses }
}

function serialize(state: LastWorkspaceState): string {
  return JSON.stringify({
    latest: state.latest,
    orgs: Object.fromEntries(state.addresses),
  })
}

/**
 * The last workspace of each org, for the person signed in. The browser
 * keeps it, so it stays after a reload and a restart of the Mac app. Each
 * person has their own key. When the browser refuses its storage, the
 * memory lasts until the page closes.
 *
 * Each change reads the storage again before it writes, so a change in one
 * tab keeps the changes of the other tabs.
 */
export class LastWorkspaces {
  private readonly store = new Store<LastWorkspaceState>(empty)
  readonly state: Readable<LastWorkspaceState> = this.store
  private person: string | null = null
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
  }

  /** The person signed in, or `null` after a sign-out. */
  follow(person: string | null): void {
    if (person === this.person) return
    this.person = person
    this.store.set(person === null ? empty : this.read(person, empty))
  }

  /** The person opened the page of a workspace. */
  remember(route: WorkspaceRoute): void {
    const address = workspaceAddress(route)
    this.update((state) => {
      if (
        state.latest === route.orgId &&
        state.addresses.get(route.orgId) === address
      ) {
        return state
      }
      const addresses = new Map(state.addresses)
      addresses.set(route.orgId, address)
      return { latest: route.orgId, addresses }
    })
  }

  /** The workspace is not available, so a switch to its org must not open it. */
  forget(orgId: string, workspaceId: string): void {
    this.update((state) => {
      const kept = workspaceOf(state.addresses.get(orgId), orgId)
      if (kept?.workspaceId !== workspaceId) return state
      const addresses = new Map(state.addresses)
      addresses.delete(orgId)
      return {
        latest: state.latest === orgId ? null : state.latest,
        addresses,
      }
    })
  }

  private update(
    change: (state: LastWorkspaceState) => LastWorkspaceState,
  ): void {
    const person = this.person
    if (person === null) return
    const current = this.read(person, this.store.get())
    const next = change(current)
    if (next !== current) this.write(person, next)
    this.store.set(next)
  }

  /** The stored state of `person`, or `fallback` without a storage. */
  private read(
    person: string,
    fallback: LastWorkspaceState,
  ): LastWorkspaceState {
    if (!this.storage) return fallback
    try {
      return parseState(this.storage.getItem(keyPrefix + person))
    } catch {
      return fallback
    }
  }

  private write(person: string, state: LastWorkspaceState): void {
    try {
      this.storage?.setItem(keyPrefix + person, serialize(state))
    } catch {
      // A full or refused storage keeps the memory until the page closes.
    }
  }
}

/** The page that opens the org: its last workspace, or else its list page. */
export function orgEntry(state: LastWorkspaceState, orgId: string): string {
  return state.addresses.get(orgId) ?? routes.org(orgId)
}

/**
 * The page that the address `/` opens, when Get started does not show: the
 * workspace that the person opened last, while its org is in the list and
 * not deleted. Otherwise there is none, and `/` opens the first org.
 */
export function startAddress(
  state: LastWorkspaceState,
  orgs: readonly OrgSummary[],
): string | null {
  const latest = state.latest
  if (latest === null) return null
  const org = orgs.find((item) => item.id === latest)
  if (!org || org.deletion) return null
  return state.addresses.get(latest) ?? null
}
