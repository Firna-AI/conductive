import { describe, expect, test } from 'vitest'
import {
  readGitHubCanWrite,
  readGitHubPullBase,
  readMergeQueueBarState,
  readMergeQueueEntry,
  readMergeQueueLeaveNotice,
  readWorkspaceListRepositories,
} from './merge-queue-read'

const entry = { queueId: 'q1', place: 2, unitId: 'u1', state: 'queued' }
const bar = {
  place: 3,
  count: 3,
  belowPullNumber: 479,
  trunk: 'main',
  state: 'restacking',
  wait: null,
}

describe('the readers of the merge queue fields', () => {
  test('read a valid entry and a valid bar state as they are', () => {
    expect(readMergeQueueEntry(entry)).toEqual(entry)
    expect(readMergeQueueBarState(bar)).toEqual(bar)
    expect(
      readMergeQueueBarState({ ...bar, belowPullNumber: null, wait: 'token' }),
    ).toEqual({ ...bar, belowPullNumber: null, wait: 'token' })
    expect(readMergeQueueBarState({ ...bar, wait: 'open-session' })).toEqual({
      ...bar,
      wait: 'open-session',
    })
  })

  test('read a missing, malformed, or future value as none, so an older reply still reads', () => {
    const entries: unknown[] = [
      undefined,
      null,
      'queued',
      { ...entry, place: 0 },
      { ...entry, place: 1.5 },
      { ...entry, queueId: '' },
      { ...entry, state: 'paused' },
    ]
    for (const value of entries)
      expect(readMergeQueueEntry(value)).toBe(undefined)
    const bars: unknown[] = [
      undefined,
      [],
      { ...bar, place: 4 },
      { ...bar, belowPullNumber: -1 },
      { ...bar, trunk: '' },
      { ...bar, state: 'paused' },
    ]
    for (const value of bars)
      expect(readMergeQueueBarState(value)).toBe(undefined)
  })

  test('read a wait that the app does not know as no wait, so the line still names the place', () => {
    expect(readMergeQueueBarState({ ...bar, wait: 'later' })).toEqual(bar)
  })

  test('read the access and the base of a pull request only when they hold a value', () => {
    expect(readGitHubCanWrite(true)).toBe(true)
    expect(readGitHubCanWrite(false)).toBe(false)
    expect(readGitHubCanWrite('true')).toBe(undefined)
    expect(readGitHubPullBase('main')).toBe('main')
    expect(readGitHubPullBase('')).toBe(undefined)
    expect(readGitHubPullBase(4)).toBe(undefined)
  })

  test('preserve checked merge counts, blocking pull numbers and saved commit IDs', () => {
    const first = { ...bar, place: 1, belowPullNumber: null }
    expect(readMergeQueueBarState({ ...first, mergeAhead: 0 })).toEqual({
      ...first,
      mergeAhead: 0,
    })
    const oldBase = 'a'.repeat(40)
    expect(
      readMergeQueueBarState({
        ...bar,
        mergeAhead: 2,
        blockedByPullNumber: 476,
        oldBase,
      }),
    ).toEqual({ ...bar, mergeAhead: 2, blockedByPullNumber: 476, oldBase })
    expect(
      readMergeQueueBarState({
        ...bar,
        mergeAhead: -1,
        blockedByPullNumber: -1,
        oldBase: 'HEAD~2',
      }),
    ).toEqual(bar)
    expect(readMergeQueueEntry({ ...entry, pullNumber: 479 })).toEqual({
      ...entry,
      pullNumber: 479,
    })
  })

  test('reads optional repository metadata and a masked leave notice', () => {
    const repository = {
      id: 'repo',
      fullName: 'org/repo',
      defaultBranch: 'trunk',
      selected: true,
      githubQueueRequired: false,
      queueInUse: true,
    }
    expect(readWorkspaceListRepositories([repository])).toEqual([repository])
    expect(readWorkspaceListRepositories(undefined)).toBe(undefined)
    expect(
      readMergeQueueLeaveNotice({ baseBranch: 'feature/[hidden]' }),
    ).toEqual({ baseBranch: 'feature/[hidden]' })
  })
})
