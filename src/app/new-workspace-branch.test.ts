import { describe, expect, test } from 'vitest'
import type { WorkspaceBranchOption } from '../shared/workspace-branches'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { branchFixtures } from '../test-support/fixtures/branches'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { record, text } from './api/parse'
import { OrgModel } from './org-model'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const [pullRequest, , fork, branch] = branchFixtures({
  fullName: 'acme/storefront',
  githubId: 1,
})
/** The defaults of the form name another repository than the chosen branch. */
const defaults = {
  repositoryId: 'billing-service',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

async function draftOf(server: FakeApiServer) {
  const model = new OrgModel(testServices(server), org)
  await model.reload('list')
  return model.newWorkspace(null)
}

/** The JSON bodies of the create requests that the server got. */
function creates(server: FakeApiServer): Promise<unknown[]> {
  return Promise.all(
    server.requests
      .filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === createPath,
      )
      .map((request): Promise<unknown> => request.json()),
  )
}

const nameOf = (row: WorkspaceBranchOption | null) =>
  row === null ? null : row.type === 'branch' ? row.name : `#${row.number}`

describe('the branch of a new workspace', () => {
  test('the create continues the branch of a chosen pull request in its repository, Try again sends it again, and the next draft starts on a new branch', async () => {
    const server = new FakeApiServer()
    server.json(
      'POST',
      createPath,
      { error: { code: 'start_failed', message: 'It did not start.' } },
      502,
    )
    const draft = await draftOf(server)
    draft.setText('Finish the gift cards.')
    draft.chooseBranch('storefront', pullRequest)
    await draft.send(defaults)
    server.json('POST', createPath, workspaceFixtures().created, 201)
    await draft.send(defaults)
    const next = draft.draft.get()
    draft.setText('Polish the receipts.')
    await draft.send(defaults)
    const sent = (await creates(server)).map((value) => {
      const body = record(value, 'create')
      const message = record(body.firstMessage, 'firstMessage')
      return {
        repositoryId: body.repositoryId,
        branch: body.branch,
        text: text(message, 'text'),
      }
    })
    const continued = {
      repositoryId: 'storefront',
      branch: { type: 'existing', name: 'priyaraman/gift-cards' },
      text: 'Finish the gift cards.',
    }
    expect({
      sent,
      next: { repositoryId: next.repository?.id ?? null, branch: next.branch },
    }).toEqual({
      sent: [
        continued,
        continued,
        {
          repositoryId: 'storefront',
          branch: undefined,
          text: 'Polish the receipts.',
        },
      ],
      next: { repositoryId: 'storefront', branch: null },
    })
  })

  test('another repository starts a new branch, the same repository and New branch behave as chosen, and a pull request from another repository cannot be chosen', async () => {
    const draft = await draftOf(new FakeApiServer())
    draft.setText('Fix the flaky cart test.')
    const { messageId } = draft.draft.get()
    const steps: unknown[] = []
    const note = (step: string) => {
      const now = draft.draft.get()
      steps.push({
        step,
        repositoryId: now.repository?.id ?? null,
        branch: nameOf(now.branch),
        kept:
          now.text === 'Fix the flaky cart test.' &&
          now.messageId === messageId,
      })
    }
    draft.chooseBranch('storefront', fork)
    note('fork')
    draft.chooseBranch('storefront', branch)
    note('branch')
    draft.setRepository('storefront')
    note('same repository')
    draft.setRepository('billing-service')
    note('another repository')
    draft.chooseBranch('billing-service', branch)
    draft.newBranch()
    note('new branch')
    expect(steps).toEqual([
      { step: 'fork', repositoryId: null, branch: null, kept: true },
      {
        step: 'branch',
        repositoryId: 'storefront',
        branch: 'calummoore/oslo-3f8k',
        kept: true,
      },
      {
        step: 'same repository',
        repositoryId: 'storefront',
        branch: 'calummoore/oslo-3f8k',
        kept: true,
      },
      {
        step: 'another repository',
        repositoryId: 'billing-service',
        branch: null,
        kept: true,
      },
      {
        step: 'new branch',
        repositoryId: 'billing-service',
        branch: null,
        kept: true,
      },
    ])
  })
})
