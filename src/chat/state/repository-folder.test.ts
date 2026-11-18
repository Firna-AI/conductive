import { describe, expect, it } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { workspaceViewPath } from '../../shared/workspace-view'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatFor } from './test-kit'

const viewPath = workspaceViewPath(FAKE_IDS.org, FAKE_IDS.workspace)
const oldFolder = '/home/user/code/checkout'
const newFolder = '/home/user/code/billing-service'

/** A chat that read the view with the folder of the old repository. */
async function chatInOldFolder(
  options: { holdViews?: () => boolean; failViews?: () => boolean } = {},
) {
  const { view } = workspaceFixtures()
  const chat = chatFor({
    hold: (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === viewPath &&
      (options.holdViews?.() ?? false),
    answer: async (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === viewPath &&
      options.failViews?.()
        ? new Response(null, { status: 503 })
        : null,
  })
  chat.server.json('GET', viewPath, {
    ...view,
    repositoryFolder: oldFolder,
    heldRepositoryIds: ['checkout', 'billing-service'],
  })
  await chat.controller.start()
  const snapshot = () => chat.controller.getSnapshot()
  const moveTo = (repositoryId: string) => {
    const workspace = snapshot().workspace
    if (!workspace) throw new Error('The chat has no workspace.')
    chat.emit({
      type: 'workspace.updated',
      workspace: {
        ...workspace,
        repositoryId,
        updatedAt: workspace.updatedAt + 1,
      },
    })
  }
  const answerWith = (repositoryFolder: string) =>
    chat.server.json('GET', viewPath, {
      ...view,
      repositoryFolder,
      heldRepositoryIds: ['checkout', 'billing-service'],
    })
  return { chat, snapshot, moveTo, answerWith }
}

describe('the folder of the repository after a repository change', () => {
  it('reads the view again and takes the folder of the new repository', async () => {
    const { chat, snapshot, moveTo, answerWith } = await chatInOldFolder()
    const before = snapshot().repositoryFolder
    answerWith(newFolder)
    moveTo('billing-service')
    const during = snapshot().repositoryFolder
    await flushMicrotasks()

    expect({
      before,
      during,
      after: snapshot().repositoryFolder,
      views: chat.requests('GET', viewPath).length,
    }).toEqual({ before: oldFolder, during: null, after: newFolder, views: 2 })
  })

  it('does not read the view again for a record of the same repository', async () => {
    const { chat, snapshot, moveTo } = await chatInOldFolder()
    moveTo(snapshot().workspace?.repositoryId ?? '')
    await flushMicrotasks()

    expect({
      folder: snapshot().repositoryFolder,
      views: chat.requests('GET', viewPath).length,
    }).toEqual({ folder: oldFolder, views: 1 })
  })

  it('keeps no folder when the read fails, and drops a reply that comes after another change', async () => {
    let fail = false
    let hold = false
    const { chat, snapshot, moveTo, answerWith } = await chatInOldFolder({
      failViews: () => fail,
      holdViews: () => hold,
    })
    fail = true
    moveTo('billing-service')
    await flushMicrotasks()
    const failed = snapshot().repositoryFolder
    fail = false
    hold = true
    moveTo('checkout')
    await flushMicrotasks()
    hold = false
    answerWith(newFolder)
    moveTo('billing-service')
    await flushMicrotasks()
    const fresh = snapshot().repositoryFolder
    answerWith('/home/user/code/stale')
    for (const release of chat.held.splice(0)) release()
    await flushMicrotasks()

    expect({ failed, fresh, late: snapshot().repositoryFolder }).toEqual({
      failed: null,
      fresh: newFolder,
      late: newFolder,
    })
  })
})
