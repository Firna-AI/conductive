import { describe, expect, test } from 'vitest'
import { orgSettingsPaths, type Repository } from '../shared/org-settings'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { repositoryFixtures } from '../test-support/fixtures/repositories'
import { formBranch } from './new-workspace-branch'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const picked = 'calummoore/checkout-autocomplete'
const defaults = {
  repositoryId: 'storefront',
  choice: {
    agent: 'claude',
    model: 'Opus 5.5',
    effort: 'high',
    fast: false,
  } as const,
}

async function loaded(server: FakeApiServer) {
  const model = new OrgModel(testServices(server), org)
  await Promise.all([model.reload('repositories'), model.reload('builds')])
  const repository = (id: string): Repository => {
    const found = valueOf(model.repositories.get())?.find(
      (item) => item.id === id,
    )
    if (!found) throw new Error(`The org has no repository ${id}.`)
    return found
  }
  return { model, draft: model.newWorkspace(null), repository }
}

/** The branch fields of each create request that the server got, in order. */
async function sentBranches(server: FakeApiServer) {
  const creates = server.requests.filter(
    (request) =>
      request.method === 'POST' && new URL(request.url).pathname === createPath,
  )
  const bodies = await Promise.all(creates.map((request) => request.json()))
  return bodies.map((body: Record<string, unknown>) => ({
    start: body.startBranch,
    base: body.baseBranch,
  }))
}

describe('the branch of a New workspace draft', () => {
  test('a create from the default branch names no branch, a picked branch starts from it and targets it first, and Target main names main as the base', async () => {
    const server = new FakeApiServer()
    const { draft, repository } = await loaded(server)
    const storefront = repository('storefront')
    draft.setText('Fix the flaky cart test.')
    await draft.send(defaults)
    draft.setText('Save carts.')
    draft.setBranch(storefront, picked)
    await draft.send(defaults)
    const afterSend = draft.draft.get().branch
    draft.setText('Save carts on main.')
    draft.setBranch(storefront, picked)
    draft.setTarget(storefront, 'default')
    await draft.send(defaults)
    draft.setText('Back to main.')
    draft.setBranch(storefront, picked)
    draft.setBranch(storefront, 'main')
    await draft.send(defaults)
    expect({ sent: await sentBranches(server), afterSend }).toEqual({
      sent: [
        { start: undefined, base: undefined },
        { start: picked, base: picked },
        { start: picked, base: 'main' },
        { start: undefined, base: undefined },
      ],
      afterSend: null,
    })
  })

  test('keeps the target that the member chose through a pick of another branch, and a change of repository clears the branch and the target', async () => {
    const server = new FakeApiServer()
    const { draft, repository } = await loaded(server)
    const storefront = repository('storefront')
    const billing = repository('billing-service')
    const shows = (on: Repository) => formBranch(draft.draft.get().branch, on)
    draft.setBranch(storefront, picked)
    const first = shows(storefront)
    const kept = draft.draft.get().repository
    draft.setTarget(storefront, 'default')
    draft.setBranch(storefront, 'develop')
    const another = shows(storefront)
    draft.setBranch(storefront, 'main')
    const onDefault = shows(storefront)
    draft.setBranch(storefront, picked)
    const back = shows(storefront)
    draft.setRepository('billing-service')
    const moved = shows(billing)
    draft.setRepository('storefront')
    const returned = shows(storefront)
    expect({ first, kept, another, onDefault, back, moved, returned }).toEqual({
      first: { name: picked, defaultBranch: 'main', target: 'picked' },
      kept: { id: 'storefront', picked: false },
      another: { name: 'develop', defaultBranch: 'main', target: 'default' },
      onDefault: { name: 'main', defaultBranch: 'main', target: null },
      back: { name: picked, defaultBranch: 'main', target: 'default' },
      moved: { name: 'main', defaultBranch: 'main', target: null },
      returned: { name: 'main', defaultBranch: 'main', target: null },
    })
  })

  test('a kept repository that the org no longer chose takes its branch with it', async () => {
    const server = new FakeApiServer()
    const { model, draft, repository } = await loaded(server)
    draft.setText('Save carts.')
    draft.setBranch(repository('storefront'), picked)
    const { repositories } = repositoryFixtures(org).repositories
    server.json('GET', orgSettingsPaths.repositories(org), {
      repositories: repositories.map((item) =>
        item.id === 'storefront' ? { ...item, selected: false } : item,
      ),
    })
    await model.reload('repositories')
    expect({
      repository: draft.draft.get().repository,
      branch: draft.draft.get().branch,
    }).toEqual({
      repository: { id: 'billing-service', picked: false },
      branch: null,
    })
  })

  test('a refused branch keeps the draft and names the branch that the create asked for, and Start from main ends the refusal on the default branch', async () => {
    const server = new FakeApiServer()
    server.json(
      'POST',
      createPath,
      {
        error: {
          code: 'branch_not_found',
          message: `The branch \`${picked}\` is no longer on GitHub.`,
        },
      },
      404,
    )
    const { draft, repository } = await loaded(server)
    const storefront = repository('storefront')
    draft.setText('Save carts.')
    draft.setBranch(storefront, picked)
    const messageId = draft.draft.get().messageId
    expect(await draft.send(defaults)).toBeNull()
    // A later pick changes the form, not what the failed create asked for.
    draft.setBranch(storefront, 'develop')
    const refused = draft.create.get()
    draft.startFromDefaultBranch(storefront)
    expect({
      refused,
      create: draft.create.get(),
      shows: formBranch(draft.draft.get().branch, storefront),
      text: draft.draft.get().text,
      kept: draft.draft.get().messageId === messageId,
    }).toEqual({
      refused: expect.objectContaining({
        state: 'failed',
        error: expect.objectContaining({
          status: 404,
          code: 'branch_not_found',
        }),
        repositoryId: 'storefront',
        startBranch: picked,
      }),
      create: { state: 'idle' },
      shows: { name: 'main', defaultBranch: 'main', target: null },
      text: 'Save carts.',
      kept: true,
    })
  })
})
