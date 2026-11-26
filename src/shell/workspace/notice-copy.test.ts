import { describe, expect, test } from 'vitest'
import type { SandboxNoticeState } from '../../ui/components/workspace/sandboxNoticeState'
import { leftTheList, problemOf } from './notice-copy'

/** The days of a workspace archived on 1 January, removed on 15 January. */
const days = { archivedOn: '1 January', removedOn: '15 January' }

/** The words of the bar and the panel of a notice, and its one action. */
function words(notice: SandboxNoticeState) {
  const problem = problemOf(notice, days)
  return {
    title: problem.title,
    body: problem.body,
    panel: problem.panelBody,
    action: problem.action ?? null,
    removed: leftTheList(notice),
  }
}

describe('the words of an archived workspace', () => {
  test('until its 14 days end the bar gives the day when it leaves the list, also without Restore, and after them it says Removed with the state of its cloud computer', () => {
    expect({
      available: words({ problem: 'archived', restore: 'available' }),
      suspended: words({ problem: 'archived', restore: 'refused' }),
      noComputer: words({ problem: 'archived' }),
      deleting: words({ problem: 'archived', restore: 'ended', removed: true }),
      removed: words({ problem: 'archived', removed: true }),
    }).toEqual({
      available: {
        title: 'Archived on 1 January',
        body: 'Restore it until 15 January to bring back its files and sessions. It leaves the list on that day.',
        panel: 'The files and the tools come back with Restore.',
        action: 'Restore',
        removed: false,
      },
      suspended: {
        title: 'Archived on 1 January',
        body: 'Your chat history is available. It leaves the list on 15 January.',
        panel: 'Your chat history is available.',
        action: null,
        removed: false,
      },
      noComputer: {
        title: 'Archived on 1 January',
        body: 'Its cloud computer is deleted, and the chat is read-only. It leaves the list on 15 January.',
        panel: 'The files and the tools went with the cloud computer.',
        action: null,
        removed: false,
      },
      deleting: {
        title: 'Removed on 15 January',
        body: 'It left the list. Its cloud computer is being deleted, and the chat is read-only.',
        panel: 'The files and the tools go with the cloud computer.',
        action: null,
        removed: true,
      },
      removed: {
        title: 'Removed on 15 January',
        body: 'It left the list. Its cloud computer is deleted, and the chat is read-only.',
        panel: 'The files and the tools went with the cloud computer.',
        action: null,
        removed: true,
      },
    })
  })

  test('uses computer evidence for archive notices and preserves legacy unknown text', () => {
    const history = {
      title: 'Archived on 1 January',
      body: 'Your chat history is available. It leaves the list on 15 January.',
      panel: 'Your chat history is available.',
      action: null,
      removed: false,
    }
    const restorable = {
      title: 'Archived on 1 January',
      body: 'Restore it until 15 January to bring back its files and sessions. It leaves the list on that day.',
      panel: 'The files and the tools come back with Restore.',
      action: 'Restore',
      removed: false,
    }
    const deleted = {
      title: 'Archived on 1 January',
      body: 'Its cloud computer is deleted, and the chat is read-only. It leaves the list on 15 January.',
      panel: 'The files and the tools went with the cloud computer.',
      action: null,
      removed: false,
    }
    const deleting = {
      title: 'Removed on 15 January',
      body: 'It left the list. Its cloud computer is being deleted, and the chat is read-only.',
      panel: 'The files and the tools go with the cloud computer.',
      action: null,
      removed: true,
    }
    const removed = {
      title: 'Removed on 15 January',
      body: 'It left the list. Its cloud computer is deleted, and the chat is read-only.',
      panel: 'The files and the tools went with the cloud computer.',
      action: null,
      removed: true,
    }
    const archived = { problem: 'archived' } as const
    expect({
      pending: words({ ...archived, computer: 'may-exist' }),
      kept: words({ ...archived, computer: 'may-exist', restore: 'available' }),
      keptEnded: words({
        ...archived,
        computer: 'may-exist',
        restore: 'ended',
        removed: true,
      }),
      pendingEnded: words({
        ...archived,
        computer: 'may-exist',
        removed: true,
      }),
      deleted: words({ ...archived, computer: 'deleted' }),
      deletedEnded: words({ ...archived, computer: 'deleted', removed: true }),
      unknown: words({ ...archived, computer: 'unknown' }),
      unknownKept: words({
        ...archived,
        computer: 'unknown',
        restore: 'available',
      }),
    }).toEqual({
      pending: history,
      kept: restorable,
      keptEnded: deleting,
      pendingEnded: deleting,
      deleted,
      deletedEnded: removed,
      unknown: deleted,
      unknownKept: restorable,
    })
  })
})
