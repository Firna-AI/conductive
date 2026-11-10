import { describe, expect, test } from 'vitest'
import { routineModel } from '../../app/routine-model'
import type { User } from '../../shared/api'
import { routinePath, type Routine } from '../../shared/routines'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { routineFixtures } from '../../test-support/fixtures/routines'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { renderScreen, startedApp, textOf } from '../test-render'
import { RoutineScreen } from './RoutineScreen'

const { org } = FAKE_IDS
const [cal, priya] = fakeUsers

function fixture(id: string): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** The words of the page of a routine, after its data loaded. */
async function pageOf(server: FakeApiServer, routineId: string, user: User) {
  const app = await startedApp(server)
  const orgModel = app.org(org)
  await Promise.all([
    routineModel(orgModel, routineId).reload(),
    orgModel.reload('repositories'),
    orgModel.reload('list'),
  ])
  const summary = app.orgs.get().find((item) => item.id === org)
  if (!summary) throw new Error('The fake org is missing.')
  return textOf(
    renderScreen(
      app,
      <RoutineScreen
        org={summary}
        routineId={routineId}
        tab="routine"
        user={user}
      />,
    ),
  )
}

describe('the notes of the routine page', () => {
  test('the page says why a routine is off, and who can turn it on', async () => {
    const removed = new FakeApiServer()
    removed.json('GET', routinePath(org, 'review-prs'), {
      routine: {
        ...fixture('review-prs'),
        repositoryId: 'admin-dashboard',
        active: false,
        inactiveReason: 'repository_removed',
      },
    })
    const pages = {
      moved: await pageOf(new FakeApiServer(), 'copy-review', cal),
      failed: await pageOf(new FakeApiServer(), 'error-triage', cal),
      failedForMember: await pageOf(
        new FakeApiServer({ role: 'member' }),
        'error-triage',
        priya,
      ),
      removed: await pageOf(removed, 'review-prs', cal),
    }
    expect({
      moved: pages.moved.includes(
        'This routine moved to you Lena Park left Acme. It stays off until you turn it on.',
      ),
      failed: pages.failed.includes(
        'This routine turned off Three runs in a row failed. Fix the cause, then turn it on.',
      ),
      failedForMember: pages.failedForMember.includes(
        'This routine turned off Three runs in a row failed. Only Cal can turn it on again.',
      ),
      memberLine: pages.failedForMember.includes('Only Cal can change'),
      removed: pages.removed.includes(
        'This routine turned off acme/admin-dashboard is no longer a chosen repository of Acme. Choose another repository, then turn it on.',
      ),
    }).toEqual({
      moved: true,
      failed: true,
      failedForMember: true,
      memberLine: false,
      removed: true,
    })
  })

  test('a suspended org shows its notice above the routine, with no action and no line about logins', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const page = await pageOf(server, 'review-prs', cal)
    expect({
      notice: page.includes(
        'Acme is suspended Its workspaces and settings are read-only.',
      ),
      owner: page.includes('Only Cal can change'),
      logins: page.includes('Runs use'),
      actions: ['Add trigger', 'Delete', 'Save', 'Turn off'].filter((name) =>
        page.includes(name),
      ),
    }).toEqual({ notice: true, owner: false, logins: false, actions: [] })
  })
})
