// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import type {
  BuildLogEvent,
  ImageBuild,
  OrgSettings,
} from '../shared/org-settings'
import { byLabel, byRole, queryByLabel } from '../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT } from '../test-support/mount'
import { MemberComputerView } from './MemberComputerView'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const now = Date.UTC(2026, 10, 5, 18)
const settings: OrgSettings = {
  installScript: 'npm ci',
  startupScript: '',
  envVars: [{ name: 'DATABASE_URL' }],
  updatedAt: 0,
  needsBuild: false,
}
const done: ImageBuild = {
  id: 'b1',
  orgId: 'acme',
  kind: 'build',
  state: 'succeeded',
  startedAt: now - 9 * 3_600_000,
  completedAt: now - 8 * 3_600_000,
  durationMs: 401_000,
  error: null,
}
// The newest build failed, so the view shows its log without a spinner. The
// continuous animation of Firna's spinner keeps an async `act` from settling
// in happy-dom.
const failed: ImageBuild = {
  ...done,
  id: 'b2',
  state: 'failed',
  startedAt: now - 12 * 60_000 - 138_000,
  completedAt: now - 12 * 60_000,
  durationMs: 138_000,
}
const newest: ImageBuild = {
  ...done,
  id: 'b3',
  startedAt: now - 134_000,
  completedAt: now,
  durationMs: 134_000,
}

function event(eventNumber: number, text: string): BuildLogEvent {
  return { eventNumber, occurredAt: now, text: `${text}\n` }
}

function view(builds: ImageBuild[], log: BuildLogEvent[]) {
  return (
    <MemberComputerView
      builds={{ builds, currentImageBuildId: 'b1' }}
      log={log}
      now={now}
      org={{ id: 'acme', name: 'Acme', role: 'member' }}
      settings={settings}
      timeZone="UTC"
      viewport="desktop"
    />
  )
}

it('shows_new_build_and_log_props_in_the_same_mounted_view', async () => {
  const first = [event(1, 'Cloning 3 repositories'), event(2, 'npm ci')]
  const mounted = await mount(view([failed, done], first))
  const log = byLabel('Build log')
  expect(log.textContent).toBe('Cloning 3 repositories\nnpm ci\n')
  expect(byRole('region', 'Builds').textContent).toContain(
    'Workspaces still start from the build of 8 hours ago.',
  )

  await mounted.rerender(
    view([failed, done], [...first, event(3, 'npm error code ERESOLVE')]),
  )
  expect(byLabel('Build log')).toBe(log)
  expect(log.textContent).toBe(
    'Cloning 3 repositories\nnpm ci\nnpm error code ERESOLVE\n',
  )

  await mounted.rerender(view([newest, failed, done], first))
  const builds = byRole('region', 'Builds').textContent
  expect(queryByLabel('Build log')).toBeNull()
  expect(builds).toContain('Succeeded in 2m 14s')
  expect(builds).toContain('History (3)')
  expect(builds).not.toContain('Workspaces still start')
})
