import { describe, expect, test } from 'vitest'
import { ComputerModel } from '../../app/computer-model'
import type { SettingsTab } from '../../app/router'
import { flushMicrotasks, ManualDelay } from '../../app/test-kit'
import {
  buildPath,
  orgSettingsPaths,
  type ImageBuild,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { renderScreen, startedApp, textOf } from '../test-render'
import { ComputerSettings } from './ComputerTab'
import { OrgSettingsScreen } from './OrgSettingsScreen'

const minute = 60_000
const hour = 60 * minute

/** The started app, with the org of the fake API and the person signed in. */
async function signedIn(server: FakeApiServer) {
  const app = await startedApp(server)
  const boot = app.boot.get()
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (boot.state !== 'ready' || !org) throw new Error('The app did not start.')
  return { app, org, user: boot.user, model: app.org(org.id) }
}

/** The labels of the settings tabs, in their order. */
function tabLabels(html: string): string[] {
  const nav = /<nav aria-label="Org settings"[^>]*>(.*?)<\/nav>/s.exec(html)
  return Array.from((nav?.[1] ?? '').matchAll(/<a [^>]*>(.*?)<\/a>/g), (tab) =>
    textOf(tab[1]),
  )
}

/** The good build that new workspaces start from, built 3 hours ago. */
const goodBuild: ImageBuild = {
  id: 'build-good',
  orgId: FAKE_IDS.org,
  kind: 'build',
  state: 'succeeded',
  startedAt: FAKE_TIME - 3 * hour,
  completedAt: FAKE_TIME - 3 * hour + 401_000,
  durationMs: 401_000,
  error: null,
}

/**
 * The Cloud computer tab as text, when `newest` is the newest build and
 * `goodBuild` the one that workspaces start from. `log` gives the texts of
 * the log events of the newest build, in their order.
 */
async function computerText(
  server: FakeApiServer,
  newest: ImageBuild,
  log: readonly string[],
): Promise<string> {
  server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), {
    builds: [newest, goodBuild],
    currentImageBuildId: goodBuild.id,
  })
  server.json('GET', buildPath(FAKE_IDS.org, newest.id), {
    build: newest,
    log: log.map((text, index) => ({
      eventNumber: index + 1,
      occurredAt: newest.startedAt + index,
      text,
    })),
  })
  const { app, org, model } = await signedIn(server)
  await model.reload('builds')
  // The model follows the log of the newest build. Its timer waits on a
  // manual delay, so the clock of the test stands still.
  const computer = new ComputerModel(model, new ManualDelay().delay)
  computer.start()
  await flushMicrotasks()
  const text = textOf(
    renderScreen(app, <ComputerSettings computer={computer} org={org} />),
  )
  computer.stop()
  return text
}

describe('OrgSettingsScreen', () => {
  test('an admin gets the tabs General, Repositories, Cloud computer, and Members, and fields for the name and the initials', async () => {
    const { app, org, user } = await signedIn(new FakeApiServer())
    const html = renderScreen(
      app,
      <OrgSettingsScreen org={org} tab="general" user={user} />,
    )
    expect(tabLabels(html)).toEqual([
      'General',
      'Repositories',
      'Cloud computer',
      'Members',
    ])
    expect(
      [...html.matchAll(/<input[^>]*value="([^"]*)"/g)].map(
        ([, value]) => value,
      ),
    ).toEqual(['Acme', 'AC'])
  })

  test('a member sees General, Repositories, and Cloud computer without edit controls', async () => {
    const { app, org, user, model } = await signedIn(
      new FakeApiServer({ role: 'member' }),
    )
    await model.reload('repositories')
    await model.reload('builds')
    const computer = new ComputerModel(model, new ManualDelay().delay)
    await computer.load()
    const screen = (tab: SettingsTab) =>
      renderScreen(app, <OrgSettingsScreen org={org} tab={tab} user={user} />)
    const pages = {
      general: screen('general'),
      repositories: screen('repositories'),
      'cloud computer': renderScreen(
        app,
        <ComputerSettings computer={computer} org={org} />,
      ),
    }
    for (const [page, html] of Object.entries(pages)) {
      expect(html, page).not.toMatch(/<button|<input|<textarea/)
      expect(textOf(html), page).not.toMatch(/Save|Build computer|Delete org/)
    }
    expect(tabLabels(pages.general)).toEqual([
      'General',
      'Repositories',
      'Cloud computer',
      'Members',
    ])
    expect(textOf(pages.general)).toContain(
      'Org Only an admin can change it. Name Acme Initials AC',
    )
    const repositories = textOf(pages.repositories)
    expect(repositories).toContain(
      'acme/storefront The online shop acme/billing-service Invoices, payments, and webhooks acme/marketing-site The public website',
    )
    expect(repositories).not.toContain('acme/admin-dashboard')
    expect(textOf(pages['cloud computer'])).toContain(
      'Startup script Runs in the cloud computer of each workspace, at each start and resume. #!/usr/bin/env bash set -euo pipefail redis-server --daemonize yes',
    )
    expect(textOf(pages['cloud computer'])).toContain(
      'Install software Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, pnpm, Bun, Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh. The install script runs only at a build of the computer.',
    )
  })

  test('a suspended org shows its notice above each tab, and no edit control, also for its only admin', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { app, org, user, model } = await signedIn(server)
    await model.reload('repositories')
    await model.reload('builds')
    const computer = new ComputerModel(model, new ManualDelay().delay)
    await computer.load()
    const screen = (tab: SettingsTab) =>
      renderScreen(app, <OrgSettingsScreen org={org} tab={tab} user={user} />)
    const notice =
      'Acme is suspended Its workspaces and settings are read-only. For questions, write to abuse@conductive.build.'
    const tabs = {
      general: screen('general'),
      repositories: screen('repositories'),
      'cloud computer': screen('cloud-computer'),
      members: screen('members'),
    }
    for (const [tab, html] of Object.entries(tabs)) {
      expect(textOf(html), tab).toContain(notice)
    }
    const pages = {
      general: tabs.general,
      repositories: tabs.repositories,
      'cloud computer': renderScreen(
        app,
        <ComputerSettings computer={computer} org={org} />,
      ),
    }
    for (const [page, html] of Object.entries(pages)) {
      expect(html, page).not.toMatch(/<button|<input|<textarea/)
      expect(textOf(html), page).not.toMatch(
        /Save|Build computer|Delete org|Leave org|Only an admin/,
      )
    }
  })

  test('an older settings reply without the base image names no software', async () => {
    const server = new FakeApiServer()
    const { installScript, startupScript, envVars, updatedAt, needsBuild } =
      coreFixtures().settings.settings
    server.json('GET', orgSettingsPaths.settings(FAKE_IDS.org), {
      settings: {
        installScript,
        startupScript,
        envVars,
        updatedAt,
        needsBuild,
      },
    })
    const { app, org, model } = await signedIn(server)
    const computer = new ComputerModel(model, new ManualDelay().delay)
    await computer.load()
    const text = textOf(
      renderScreen(app, <ComputerSettings computer={computer} org={org} />),
    )
    expect(text).toContain(
      'Install software The install script runs only when you build the computer.',
    )
    expect(text).not.toContain('Cloud computers run')
  })

  test('a failed newest build shows its saved message, the end of its log, Try again, and the good build that workspaces still start from', async () => {
    const server = new FakeApiServer()
    const failed: ImageBuild = {
      ...goodBuild,
      id: 'build-failed',
      state: 'failed',
      startedAt: FAKE_TIME - 12 * minute,
      completedAt: FAKE_TIME - 12 * minute + 138_000,
      durationMs: 138_000,
      error: 'The install script stopped with exit code 1.',
    }
    const text = await computerText(server, failed, [
      'Running the ',
      'install script\nnpm error code ERESOLVE\n',
      'The install script stopped with exit code 1.\n',
    ])
    expect(text).toContain(
      'Last build 12 minutes ago Failed after 2m 18s Try again The install script stopped with exit code 1. Running the install script npm error code ERESOLVE The install script stopped with exit code 1. Workspaces still start from the build of 3 hours ago. History (2)',
    )
  })

  test('a running build names its 60-minute limit under its log', async () => {
    const server = new FakeApiServer()
    const running: ImageBuild = {
      ...goodBuild,
      id: 'build-running',
      state: 'running',
      startedAt: FAKE_TIME - 134_000,
      completedAt: null,
      durationMs: null,
    }
    const text = await computerText(server, running, [
      'Running the install script\n',
    ])
    expect(text).toContain(
      'Building · 2m 14s Build computer Running the install script Workspaces start from the build of 3 hours ago until this one finishes. Each build has a 60-minute limit.',
    )
  })
})
