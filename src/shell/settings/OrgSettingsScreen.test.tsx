import { describe, expect, test } from 'vitest'
import { ComputerModel } from '../../app/computer-model'
import type { SettingsTab } from '../../app/router'
import { ManualDelay } from '../../app/test-kit'
import {
  buildPath,
  orgSettingsPaths,
  type ImageBuild,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
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

describe('OrgSettingsScreen', () => {
  test('a member sees no Boat key tab, and General, Repositories, and Cloud computer without edit controls', async () => {
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
      'boat-key address': screen('boat-key'),
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
    expect(textOf(pages['boat-key address'])).toContain(
      'Org Only an admin can change it. Name Acme',
    )
    const repositories = textOf(pages.repositories)
    expect(repositories).toContain(
      'acme/storefront The online shop acme/billing-service Invoices, payments, and webhooks acme/marketing-site The public website',
    )
    expect(repositories).not.toContain('acme/admin-dashboard')
    expect(textOf(pages['cloud computer'])).toContain(
      'Startup script Runs in the cloud computer of each workspace, at each start and resume. #!/usr/bin/env bash set -euo pipefail redis-server --daemonize yes',
    )
  })

  test('a failed newest build shows the end of its log, Try again, and the good build that workspaces still start from', async () => {
    const server = new FakeApiServer()
    const good: ImageBuild = {
      id: 'build-good',
      orgId: FAKE_IDS.org,
      kind: 'build',
      state: 'succeeded',
      startedAt: FAKE_TIME - 3 * hour,
      completedAt: FAKE_TIME - 3 * hour + 401_000,
      durationMs: 401_000,
      error: null,
    }
    const failed: ImageBuild = {
      ...good,
      id: 'build-failed',
      state: 'failed',
      startedAt: FAKE_TIME - 12 * minute,
      completedAt: FAKE_TIME - 12 * minute + 138_000,
      durationMs: 138_000,
      error: 'The install script stopped with exit code 1.',
    }
    server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), {
      builds: [failed, good],
      currentImageBuildId: good.id,
    })
    server.json('GET', buildPath(FAKE_IDS.org, failed.id), {
      build: failed,
      log: [
        { eventNumber: 1, occurredAt: failed.startedAt, text: 'Running the ' },
        {
          eventNumber: 2,
          occurredAt: failed.startedAt + 1,
          text: 'install script\nnpm error code ERESOLVE\n',
        },
        {
          eventNumber: 3,
          occurredAt: failed.startedAt + 2,
          text: 'The install script stopped with exit code 1.\n',
        },
      ],
    })
    const { app, org, model } = await signedIn(server)
    await model.reload('builds')
    const computer = new ComputerModel(model, new ManualDelay().delay)
    await computer.showLog(failed)
    const text = textOf(
      renderScreen(app, <ComputerSettings computer={computer} org={org} />),
    )
    expect(text).toContain(
      'Last build 12 minutes ago Failed after 2m 18s Try again Running the install script npm error code ERESOLVE The install script stopped with exit code 1. Workspaces still start from the build of 3 hours ago. History (2)',
    )
  })
})
