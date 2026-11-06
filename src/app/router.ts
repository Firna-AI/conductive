import type { Agent } from '../shared/agents'

export const SETTINGS_TABS = [
  'general',
  'repositories',
  'cloud-computer',
  'members',
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

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
  | { screen: 'not-found' }

const encode = encodeURIComponent

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
} as const

function settingsTab(value: string | undefined): SettingsTab | null {
  if (value === undefined) return 'general'
  return SETTINGS_TABS.find((tab) => tab === value) ?? null
}

function agentParam(value: string | null): Agent | null {
  return value === 'claude' || value === 'codex' ? value : null
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** Reads the screen of an address. An unknown address is `not-found`. */
export function parseRoute(pathname: string, search: string): Route {
  const query = new URLSearchParams(search)
  const parts = pathname.split('/').filter((part) => part !== '')
  const segments = parts.map(decode)
  if (segments.some((segment) => segment === null)) {
    return { screen: 'not-found' }
  }
  const [first, orgId, area, id, ...rest] = segments.filter(
    (segment): segment is string => segment !== null,
  )
  if (first === undefined) return { screen: 'home' }
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
