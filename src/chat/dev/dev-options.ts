import type { OrgRole } from '../../shared/api'
import type { WorkspaceState } from '../../shared/workspaces'
import type { FakeMacScenario } from '../../test-support/fixtures/devices'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'

/** The state that the development page draws, read from its address. */
export interface DevOptions {
  /** A recorded chat, or `loss`: the data that the chat does not have. */
  scenario: RecordedChatScenario | 'loss'
  workspace: 'existing' | 'new'
  state: WorkspaceState
  role: OrgRole
  key: boolean
  login: boolean
  /**
   * The login of the member who started each session: it works, it is not
   * available, older records name no starter, or the reader's message has
   * opened a linked session from the first session.
   */
  starter: 'on' | 'off' | 'none' | 'linked'
  replay: 'stored' | 'live'
  viewport: 'desktop' | 'mobile'
  scheme: 'dark' | 'light'
  clock: 'running' | 'frozen'
  /** The Mac commands of the workspace. */
  mac: FakeMacScenario
  /** The window: a browser, or the Mac app on the Mac that got the requests. */
  app: 'browser' | 'mac'
  /**
   * What the Mac does with a change of its settings: makes and saves it,
   * makes it but does not save it, or does not make it.
   */
  change: 'done' | 'done-not-saved' | 'failed'
  /** The chat, or the This Mac section of the Mac app's account. */
  page: 'chat' | 'this-mac'
}

export const choices = {
  scenario: [
    'history',
    'running',
    'steer',
    'interrupted',
    'failed',
    'queued',
    'first-turn',
    'loss',
  ],
  workspace: ['existing', 'new'],
  state: [
    'ready',
    'working',
    'input',
    'unread',
    'starting',
    'stopped',
    'error',
    'archived',
  ],
  role: ['admin', 'member'],
  key: ['on', 'off'],
  login: ['on', 'off'],
  starter: ['on', 'off', 'none', 'linked'],
  replay: ['stored', 'live'],
  viewport: ['desktop', 'mobile'],
  scheme: ['dark', 'light'],
  clock: ['running', 'frozen'],
  mac: [
    'none',
    'waiting',
    'longer',
    'several',
    'many',
    'running',
    'denied',
    'done',
    'exit-code',
    'cut',
    'timed-out',
    'failed',
    'unavailable',
    'literal',
  ],
  app: ['browser', 'mac'],
  change: ['done', 'done-not-saved', 'failed'],
  page: ['chat', 'this-mac'],
} as const satisfies Record<keyof DevOptions, readonly string[]>

/** The options in the order that the page lists them. */
export const optionNames = [
  'scenario',
  'workspace',
  'state',
  'role',
  'key',
  'login',
  'starter',
  'replay',
  'viewport',
  'scheme',
  'clock',
  'mac',
  'app',
  'change',
  'page',
] as const satisfies readonly (keyof DevOptions)[]

function pick<T extends string>(
  options: readonly T[],
  value: string | null,
): T {
  return options.find((option) => option === value) ?? options[0]
}

export function readOptions(search: string): DevOptions {
  const params = new URLSearchParams(search)
  const get = (name: keyof DevOptions) => params.get(name)
  return {
    scenario: pick(choices.scenario, get('scenario')),
    workspace: pick(choices.workspace, get('workspace')),
    state: pick(choices.state, get('state')),
    role: pick(choices.role, get('role')),
    key: pick(choices.key, get('key')) === 'on',
    login: pick(choices.login, get('login')) === 'on',
    starter: pick(choices.starter, get('starter')),
    replay: pick(choices.replay, get('replay')),
    viewport: pick(choices.viewport, get('viewport')),
    scheme: pick(choices.scheme, get('scheme')),
    clock: pick(choices.clock, get('clock')),
    mac: pick(choices.mac, get('mac')),
    app: pick(choices.app, get('app')),
    change: pick(choices.change, get('change')),
    page: pick(choices.page, get('page')),
  }
}

/** The value of each option as its address shows it. */
export function optionValue(
  options: DevOptions,
  name: keyof DevOptions,
): string {
  const value = options[name]
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  return value
}
