import { describe, expect, test } from 'vitest'
import { routineModel } from '../../app/routine-model'
import type { RoutineTab } from '../../app/router'
import type { User } from '../../shared/api'
import { routinePath, type Routine } from '../../shared/routines'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { routineFixtures } from '../../test-support/fixtures/routines'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { renderScreen, startedApp, textOf } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { RoutineScreen } from './RoutineScreen'

const { org } = FAKE_IDS
const [cal, priya] = fakeUsers
const id = 'review-prs'

function fixture(routineId: string): Routine {
  const routine = routineFixtures().routines.find(
    (item) => item.id === routineId,
  )
  if (!routine) throw new Error(`The fixtures have no routine ${routineId}.`)
  return routine
}

/**
 * The routine that reviews pull requests, in the repository
 * `repositoryId`, after the app turned it off because its repository
 * stopped being a chosen repository of Acme.
 */
function removed(repositoryId: string): Routine {
  return {
    ...fixture(id),
    repositoryId,
    active: false,
    inactiveReason: 'repository_removed',
  }
}

/** A server whose routine page shows the routine `routine`. */
function serving(routine: Routine, options?: { role: 'member' }) {
  const server = new FakeApiServer(options)
  server.json('GET', routinePath(org, routine.id), { routine })
  return server
}

/**
 * The words of the page of a routine, after its data loaded, on the tab
 * and the viewport that it names, or on the Routine tab of a desktop.
 */
async function pageOf(
  server: FakeApiServer,
  routineId: string,
  user: User,
  shown: { tab?: RoutineTab; viewport?: Viewport } = {},
) {
  const app = await startedApp(server)
  const orgModel = app.org(org)
  const model = routineModel(orgModel, routineId)
  await Promise.all([
    model.reload(),
    model.runs.reload(),
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
        tab={shown.tab ?? 'routine'}
        user={user}
      />,
      { viewport: shown.viewport },
    ),
  )
}

/** The notice of the suspended Acme. */
const suspension =
  'Acme is suspended Its workspaces and settings are read-only. For questions, write to abuse@conductive.build.'

describe('the notes of the routine page', () => {
  test('the page says why a routine is off, and who can turn it on', async () => {
    const pages = {
      moved: await pageOf(new FakeApiServer(), 'copy-review', cal),
      failed: await pageOf(new FakeApiServer(), 'error-triage', cal),
      failedForMember: await pageOf(
        new FakeApiServer({ role: 'member' }),
        'error-triage',
        priya,
      ),
      removed: await pageOf(serving(removed('admin-dashboard')), id, cal),
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

  test('once the routine has a chosen repository, the note of a removed repository names none, says that it stays off, and says who can turn it on', async () => {
    const chosen = removed('storefront')
    const pages = {
      owner: await pageOf(serving(chosen), id, cal),
      member: await pageOf(serving(chosen, { role: 'member' }), id, priya),
      // A repository that the org does not list has no name to show.
      unlisted: await pageOf(serving(removed('gone-repository')), id, cal),
    }
    const past =
      'This routine turned off Its repository stopped being a chosen repository of Acme.'
    expect({
      owner: pages.owner.includes(`${past} It stays off until you turn it on.`),
      member: pages.member.includes(`${past} Only Cal can turn it on again.`),
      unlisted: pages.unlisted.includes(
        `${past} It stays off until you turn it on.`,
      ),
    }).toEqual({ owner: true, member: true, unlisted: true })
  })

  test('a suspended org shows its notice above the routine, with no action and no line about logins', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const page = await pageOf(server, id, cal)
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

  test('a suspended org shows its notice above the Runs tab of a phone, and above a routine that the org no longer has', async () => {
    const runs = new FakeApiServer()
    serveSuspendedAcme(runs)
    const gone = new FakeApiServer()
    serveSuspendedAcme(gone)
    gone.json(
      'GET',
      routinePath(org, id),
      {
        error: {
          code: 'routine_not_found',
          message: 'The routine is not available.',
        },
      },
      404,
    )
    const pages = {
      runs: await pageOf(runs, id, cal, { tab: 'runs', viewport: 'phone' }),
      unavailable: await pageOf(gone, id, cal),
    }
    expect({
      runs: {
        notice: pages.runs.includes(suspension),
        prompt: pages.runs.includes(fixture(id).prompt),
      },
      unavailable: pages.unavailable.includes(
        `${suspension} This routine is not available Open Routines`,
      ),
    }).toEqual({
      runs: { notice: true, prompt: false },
      unavailable: true,
    })
  })
})
