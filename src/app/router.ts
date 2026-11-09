import type { Agent } from '../shared/agents'

export const SETTINGS_TABS = [
  'general',
  'repositories',
  'cloud-computer',
  'members',
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

/**
 * A page of the operator section: a tab, or the page of one org or one
 * user. A tab of a list keeps its search, which is empty for the newest
 * first.
 */
export type OperatorView =
  | { page: 'overview' }
  | { page: 'orgs'; search: string }
  | { page: 'users'; search: string }
  | { page: 'org'; id: string }
  | { page: 'user'; githubId: number }

/** The screen that an address shows. */
export type Route =
  | { screen: 'home' }
  | { screen: 'get-started' }
  | { screen: 'account'; connect: Agent | null }
  | { screen: 'create-org'; first: boolean }
  | { screen: 'org'; orgId: string }
  | { screen: 'new-workspace'; orgId: string; sectionId: string | null }
  /** `view` holds the path after the workspace, such as `files`, for its tabs. */
  | {
      screen: 'workspace'
      orgId: string
      workspaceId: string
      view: readonly string[]
    }
  | { screen: 'settings'; orgId: string; tab: SettingsTab }
  /** The operator section. The shell shows it only to an operator. */
  | { screen: 'operator'; view: OperatorView }
  | { screen: 'not-found' }

const encode = encodeURIComponent

/** The address of a list of the operator, with its search in `q`. */
function operatorList(list: 'orgs' | 'users', search: string): string {
  const query = new URLSearchParams()
  if (search !== '') query.set('q', search)
  return query.size ? `/operator/${list}?${query}` : `/operator/${list}`
}

/** The address of each screen. Tabs are links, so each tab has its own. */
export const routes = {
  home: () => '/',
  getStarted: () => '/get-started',
  account: (connect?: Agent) =>
    connect ? `/account?connect=${connect}` : '/account',
  createOrg: (first = false) => (first ? '/orgs/new?first=1' : '/orgs/new'),
  org: (orgId: string) => `/orgs/${encode(orgId)}`,
  newWorkspace: (orgId: string, sectionId?: string) =>
    sectionId
      ? `/orgs/${encode(orgId)}/new?section=${encode(sectionId)}`
      : `/orgs/${encode(orgId)}/new`,
  workspace: (orgId: string, workspaceId: string, ...view: string[]) =>
    [`/orgs/${encode(orgId)}/workspaces/${encode(workspaceId)}`]
      .concat(view.map(encode))
      .join('/'),
  settings: (orgId: string, tab: SettingsTab = 'general') =>
    tab === 'general'
      ? `/orgs/${encode(orgId)}/settings`
      : `/orgs/${encode(orgId)}/settings/${tab}`,
  operator: () => '/operator',
  operatorOrgs: (search = '') => operatorList('orgs', search),
  operatorUsers: (search = '') => operatorList('users', search),
  operatorOrg: (orgId: string) => `/operator/orgs/${encode(orgId)}`,
  operatorUser: (githubId: number) => `/operator/users/${githubId}`,
} as const

function settingsTab(value: string | undefined): SettingsTab | null {
  if (value === undefined) return 'general'
  return SETTINGS_TABS.find((tab) => tab === value) ?? null
}

function agentParam(value: string | null): Agent | null {
  return value === 'claude' || value === 'codex' ? value : null
}

/** A numeric GitHub user ID, as the address of a user writes it. */
function githubIdOf(segment: string): number | null {
  if (!/^[1-9]\d*$/.test(segment)) return null
  const id = Number(segment)
  return Number.isSafeInteger(id) ? id : null
}

/**
 * The page of an address under `/operator`, from the parts after it. A
 * search of only spaces is no search.
 */
function operatorView(
  parts: readonly string[],
  query: URLSearchParams,
): OperatorView | null {
  const [list, id, ...rest] = parts
  const search = query.get('q')?.trim() ?? ''
  if (list === undefined) return { page: 'overview' }
  if (rest.length > 0) return null
  if (list === 'orgs') {
    return id === undefined ? { page: 'orgs', search } : { page: 'org', id }
  }
  if (list !== 'users') return null
  if (id === undefined) return { page: 'users', search }
  const githubId = githubIdOf(id)
  return githubId === null ? null : { page: 'user', githubId }
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function isText(segment: string | null): segment is string {
  return segment !== null
}

/** Reads the screen of an address. An unknown address is `not-found`. */
export function parseRoute(pathname: string, search: string): Route {
  const query = new URLSearchParams(search)
  const parts = pathname.split('/').filter((part) => part !== '')
  const segments = parts.map(decode)
  if (segments.some((segment) => segment === null)) {
    return { screen: 'not-found' }
  }
  const decoded = segments.filter(isText)
  const [first, orgId, area, id, ...rest] = decoded
  if (first === undefined) return { screen: 'home' }
  if (first === 'operator') {
    const view = operatorView(decoded.slice(1), query)
    return view ? { screen: 'operator', view } : { screen: 'not-found' }
  }
  if (first === 'get-started' && orgId === undefined) {
    return { screen: 'get-started' }
  }
  if (first === 'account' && orgId === undefined) {
    return { screen: 'account', connect: agentParam(query.get('connect')) }
  }
  if (first !== 'orgs' || orgId === undefined) return { screen: 'not-found' }
  if (orgId === 'new' && area === undefined) {
    return { screen: 'create-org', first: query.get('first') === '1' }
  }
  if (area === undefined) return { screen: 'org', orgId }
  if (area === 'new' && id === undefined) {
    return { screen: 'new-workspace', orgId, sectionId: query.get('section') }
  }
  if (area === 'workspaces' && id !== undefined) {
    return { screen: 'workspace', orgId, workspaceId: id, view: rest }
  }
  if (area === 'settings' && rest.length === 0) {
    const tab = settingsTab(id)
    if (tab) return { screen: 'settings', orgId, tab }
  }
  return { screen: 'not-found' }
}

/** The org that a screen belongs to, for the rail and the sidebar. */
export function routeOrgId(route: Route): string | null {
  return 'orgId' in route ? route.orgId : null
}
