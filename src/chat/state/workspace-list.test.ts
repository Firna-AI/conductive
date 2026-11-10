import { describe, expect, test } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { workspacesPath } from '../../shared/workspaces'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatFor } from './test-kit'

describe('the workspace list of a chat without sources', () => {
  test('reads the list while the chat shows, again on its timer, and not while the chat is hidden', async () => {
    const chat = chatFor()
    const reads = () =>
      chat.requests('GET', workspacesPath(FAKE_IDS.org)).length
    await chat.controller.start()
    await flushMicrotasks()
    expect({
      reads: reads(),
      ids: chat.controller.workspaceList.workspaces
        .get()
        ?.map((workspace) => workspace.id),
    }).toEqual({
      reads: 1,
      ids: workspaceFixtures().workspaces.workspaces.map(
        (workspace) => workspace.id,
      ),
    })

    chat.timers.runAll()
    await flushMicrotasks()
    expect(reads()).toBe(2)

    chat.controller.hide()
    chat.timers.runAll()
    await flushMicrotasks()
    expect(reads()).toBe(2)

    chat.controller.show()
    await flushMicrotasks()
    expect(reads()).toBe(3)
  })
})
