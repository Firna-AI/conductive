// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { productName } from '../../../docs/mockups/src/brand'
import type { SettingsTab } from '../../app/router'
import { valueOf } from '../../app/store'
import { ManualDelay, requestLines } from '../../app/test-kit'
import { memberPath, membersPath } from '../../shared/members'
import {
  buildPath,
  orgSettingsPaths,
  type BuildLogEvent,
  type ImageBuild,
} from '../../shared/org-settings'
import { sectionsPath } from '../../shared/sections'
import { workspacesPath } from '../../shared/workspaces'
import {
  byDialog,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { mountScreen } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The started app over the fake API, with Acme and the person signed in. */
async function signedIn(server: FakeApiServer, delay = new ManualDelay()) {
  const app = await startedApp(server, { delay: delay.delay })
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const settings = (tab: SettingsTab) =>
    mountScreen(
      app,
      <OrgSettingsScreen org={acme} tab={tab} user={boot.user} />,
    )
  return { app, settings }
}

/** The labels of the settings tabs, in their order. */
function tabLabels(html: string): string[] {
  const nav = /<nav aria-label="Org settings"[^>]*>(.*?)<\/nav>/s.exec(html)
  return Array.from((nav?.[1] ?? '').matchAll(/<a [^>]*>(.*?)<\/a>/g), (tab) =>
    textOf(tab[1]),
  )
}

function line(eventNumber: number, text: string): BuildLogEvent {
  return { eventNumber, occurredAt: FAKE_TIME, text: `${text}\n` }
}

describe('the org settings of a member who is not an admin', () => {
  test('a member sees General, Repositories, and Cloud computer without edit controls, and each Secret mark as a word', async () => {
    holdAnimationFrames()
    const { settings } = await signedIn(new FakeApiServer({ role: 'member' }))
    const general = settings('general')
    const repositories = settings('repositories')
    const computer = settings('cloud-computer')
    await waitFor(
      () => queryByRole('list', 'Repositories', repositories),
      'the repositories of Acme',
    )
    await waitFor(
      () => textOf(computer.innerHTML).includes('Startup script'),
      'the settings of the cloud computer',
    )
    const pages = {
      general: general.innerHTML,
      repositories: repositories.innerHTML,
      'cloud computer': computer.innerHTML,
    }
    for (const [page, html] of Object.entries(pages)) {
      expect(html, page).not.toMatch(/<button|<input|<textarea|role="switch"/)
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
    const listed = textOf(pages.repositories)
    expect(listed).toContain(
      'acme/storefront The online shop acme/billing-service Invoices, payments, and webhooks acme/marketing-site The public website',
    )
    expect(listed).not.toContain('acme/admin-dashboard')
    expect(textOf(pages['cloud computer'])).toContain(
      'Startup script Runs in the cloud computer of each workspace, at each start and resume. #!/usr/bin/env bash set -euo pipefail redis-server --daemonize yes',
    )
    expect(textOf(pages['cloud computer'])).toContain(
      'Install software Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, pnpm, Bun, Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh. The install script runs only at a build of the computer.',
    )
    expect(textOf(pages['cloud computer'])).toContain(
      `DATABASE_URL Secret •••••••• PLACES_API_KEY Secret •••••••• STRIPE_SECRET_KEY Secret •••••••• NEXT_PUBLIC_SITE_URL •••••••• ${productName} hides secret values in agent output and start logs. Changes apply at the next start.`,
    )
  })

  test('the read-only Cloud computer tab follows a running build, its new log lines, and its end', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ role: 'member' })
    const { build: done } = coreFixtures().build
    const running: ImageBuild = {
      ...done,
      id: 'build-2',
      state: 'running',
      startedAt: FAKE_TIME - 134_000,
      completedAt: null,
      durationMs: null,
    }
    const history = (newest: ImageBuild) => ({
      builds: [newest, done],
      currentImageBuildId: done.id,
    })
    const first = [line(1, 'Cloning 3 repositories')]
    const more = [...first, line(2, 'added 1184 packages')]
    server.json('GET', orgSettingsPaths.builds(org), history(running))
    server.json('GET', buildPath(org, running.id), {
      build: running,
      log: first,
    })
    const delay = new ManualDelay()
    const { settings } = await signedIn(server, delay)
    const view = settings('cloud-computer')
    const shownLog = () => queryByLabel('Build log', view)?.textContent
    await waitFor(() => shownLog() === first[0].text, 'the first log line')
    const builds = () => textOf(byRole('region', 'Builds', view).innerHTML)
    const head = builds()
    // The follower reads the log again on its timer while the build runs.
    server.json('GET', buildPath(org, running.id), {
      build: running,
      log: more,
    })
    await delay.runAll()
    await waitFor(() => shownLog()?.includes('added 1184'), 'the new line')
    const followed = shownLog()
    const ended: ImageBuild = {
      ...running,
      state: 'succeeded',
      completedAt: FAKE_TIME,
      durationMs: 134_000,
    }
    server.json('GET', buildPath(org, running.id), { build: ended, log: more })
    server.json('GET', orgSettingsPaths.builds(org), history(ended))
    await delay.runAll()
    await waitFor(
      () => queryByLabel('Build log', view) === null,
      'the end of the build',
    )
    expect({
      head,
      followed,
      ended: builds(),
    }).toEqual({
      head: expect.stringContaining('Building · 2m 14s') as unknown,
      followed: 'Cloning 3 repositories\nadded 1184 packages\n',
      ended: expect.stringContaining(
        'Last build Just now Succeeded in 2m 14s',
      ) as unknown,
    })
  })
})

describe('the Members tab of an admin', () => {
  test('in a suspended org the Members tab lists the members without the invite, role menus, Remove, and invites, also for its admin', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { settings } = await signedIn(server)
    const view = settings('members')
    const list = await waitFor(
      () => queryByRole('list', 'Members', view),
      'the members of Acme',
    )
    const { members, invites } = coreFixtures().members
    const text = list.textContent ?? ''
    expect({
      rows: list.querySelectorAll(':scope > li').length,
      invites: invites.filter((invite) => text.includes(invite.email)).length,
      buttons: view.querySelectorAll('button').length,
      fields: view.querySelectorAll('input, textarea').length,
    }).toEqual({ rows: members.length, invites: 0, buttons: 0, fields: 0 })
  })

  test('a removal reads the workspaces and the members of the org again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { app, settings } = await signedIn(server)
    const view = settings('members')
    const remove = await waitFor(
      () => queryByRole('button', 'Remove Priya Raman', view),
      'the members of Acme',
    )
    // The server moves the workspaces of Priya to Cal, who removes her.
    const { workspaces } = workspaceFixtures().workspaces
    const moved = workspaces.map((workspace) =>
      workspace.owner.id === 'priya'
        ? { ...workspace, owner: fakeUser }
        : workspace,
    )
    const { members, invites } = coreFixtures().members
    server.json('GET', workspacesPath(org), { workspaces: moved })
    server.json('GET', membersPath(org), {
      members: members.filter((member) => member.user.id !== 'priya'),
      invites,
    })
    const model = app.org(org)
    const from = server.requests.length
    await press(remove)
    const dialog = byDialog('Remove Priya Raman from Acme?')
    await press(byRole('button', 'Remove member', dialog))
    await waitFor(
      () => model.members.get().state === 'ready',
      'the members of the org',
    )
    await waitFor(() => valueOf(model.workspaces.get()), 'the workspaces')
    expect({
      requests: requestLines(server).slice(from),
      owners: valueOf(model.workspaces.get())?.some(
        (workspace) => workspace.owner.id === 'priya',
      ),
      members: valueOf(model.members.get())?.members.map(
        (member) => member.user.id,
      ),
    }).toEqual({
      requests: [
        `DELETE ${memberPath(org, 'priya')}`,
        `GET ${sectionsPath(org)}`,
        `GET ${workspacesPath(org)}`,
        `GET ${membersPath(org)}`,
      ],
      owners: false,
      members: ['cal', 'jonas'],
    })
  })
})
