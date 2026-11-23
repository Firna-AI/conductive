import { describe, expect, it } from 'vitest'
import type { MergeQueueBarState } from '../shared/generated/MergeQueueBarState'
import type { BannerState } from '../shared/github'
import { promptOf } from './barPrompts'
import { barViewOf, type BarInput, type BarView } from './barView'
import type { QueueInput } from './queueView'
import { snapshotOf } from './testing'

const writer: BarInput['capabilities'] = {
  status: 'ready',
  capabilities: { canWrite: true, mergeMethod: 'squash' },
}

const entry: MergeQueueBarState = {
  place: 3,
  count: 3,
  belowPullNumber: 479,
  trunk: 'main',
  state: 'queued',
  wait: null,
}

const canJoin: QueueInput = { listed: false, canJoin: true, adding: false }

function view(
  state: BannerState,
  queue: MergeQueueBarState | undefined,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
): BarView {
  return barViewOf({
    snapshot: { ...snapshotOf(state), ...(queue && { queue }) },
    capabilities: writer,
    localWork: 'none',
    outcome: null,
    turnRuns: false,
    readOnly: false,
    archivable: true,
    archiving: false,
    queue: canJoin,
    ...input,
  })
}

const kinds = (bar: BarView) =>
  bar.actions.map((action) =>
    action.kind === 'agent'
      ? action.action
      : action.kind === 'merge'
        ? `merge${action.busy ? ':busy' : ''}`
        : action.kind,
  )

describe('the merge queue in the bar', () => {
  it('names the place and what the queue waits for in each state of a layer, and offers Remove from queue', () => {
    const line = (
      state: BannerState,
      queue: Partial<MergeQueueBarState> = {},
      input: Partial<Omit<BarInput, 'snapshot'>> = {},
    ) => view(state, { ...entry, ...queue }, input).queue?.line
    expect(line('checks-running')).toEqual({
      text: 'Place 3 of 3 in the merge queue. It builds on #479.',
      running: false,
      remove: true,
      href: null,
    })
    expect(line('checks-failed')?.text).toBe(
      'Place 3 of 3 in the merge queue. The queue waits for its checks.',
    )
    expect(line('conflict')?.text).toBe(
      'Place 3 of 3 in the merge queue. The queue waits for a rebase onto #479.',
    )
    expect(line('checks-running', { state: 'restacking' })).toMatchObject({
      text: 'Place 3 of 3 in the merge queue. Rebasing onto #479.',
      running: true,
    })
    expect(
      line(
        'ready-to-merge',
        { place: 1, belowPullNumber: null },
        {
          localWork: 'changes',
        },
      )?.text,
    ).toBe(
      'Place 1 of 3 in the merge queue. The queue waits for its local work to be pushed.',
    )
    expect(line('ready-to-merge', { wait: 'token' })?.text).toBe(
      'Place 3 of 3 in the merge queue. The GitHub access of the member who added it stopped working.',
    )
    expect(
      line('ready-to-merge', { wait: 'lower-layer', blockedByPullNumber: 476 })
        ?.text,
    ).toBe('Place 3 of 3 in the merge queue. The queue waits for #476.')
    const held = (wait: MergeQueueBarState['wait']) =>
      line('conflict', { state: 'waiting', wait })?.text
    expect([
      held('active-turn'),
      held('agent-login'),
      held('open-session'),
    ]).toEqual([
      'Place 3 of 3 in the merge queue. The queue waits for a running turn to end.',
      'Place 3 of 3 in the merge queue. The queue waits for an agent login for the member who added it.',
      'Place 3 of 3 in the merge queue. The queue waits for an open session.',
    ])
    expect(line('ready-to-merge', { wait: 'merge-refused' })?.href).toBe(
      snapshotOf('ready-to-merge').banner.pullRequest?.url,
    )
  })

  it('offers no Merge that would race the queue, shows Merge busy while the queue merges, and no Remove then', () => {
    const ready = view('ready-to-merge', entry)
    const merging = view('ready-to-merge', { ...entry, state: 'merging' })
    expect({
      ready: kinds(ready),
      merging: kinds(merging),
      line: merging.queue?.line?.text,
      remove: merging.queue?.line?.remove,
      row: merging.queue?.row,
    }).toEqual({
      ready: [],
      merging: ['merge:busy'],
      line: 'Place 3 of 3 in the merge queue. Merging into main.',
      remove: false,
      row: 'Queue 3 of 3',
    })
  })

  it('offers Resolve conflicts after a queue restack fails against a base GitHub has yet to see', () => {
    const queue = {
      ...entry,
      state: 'waiting',
      wait: 'rebase',
    } satisfies MergeQueueBarState
    const bar = view('ready-to-merge', queue)
    expect(kinds(bar)).toEqual(['resolve-conflicts'])
    expect(bar.queue?.line?.text).toBe(
      'Place 3 of 3 in the merge queue. The queue waits for a rebase onto #479.',
    )
    expect(
      kinds(view('ready-to-merge', queue, { localWork: 'commits' })),
    ).toEqual(['push'])

    const ready = snapshotOf('ready-to-merge')
    const oldBase = 'a'.repeat(40)
    const bottom = {
      ...ready,
      banner: { ...ready.banner, baseBranch: 'old-layer' },
      queue: { ...queue, place: 1, belowPullNumber: null, oldBase },
    }
    expect(promptOf('resolve-conflicts', bottom)).toContain(
      `git rebase --onto FETCH_HEAD ${oldBase}`,
    )
  })

  it('uses the count from the checked prefix and preserves the bottom-layer action', () => {
    expect(
      view('ready-to-merge', {
        ...entry,
        mergeAhead: 2,
        wait: 'lower-layer',
        blockedByPullNumber: 476,
      }).actions,
    ).toEqual([{ kind: 'merge', method: 'squash', below: 2, busy: false }])
    expect(
      view('ready-to-merge', {
        ...entry,
        place: 1,
        belowPullNumber: null,
        mergeAhead: 0,
      }).actions,
    ).toEqual([{ kind: 'merge', method: 'squash', below: 0, busy: false }])
    expect(
      view('ready-to-merge', undefined, { queue: { ...canJoin, listed: true } })
        .actions,
    ).toEqual([])
  })

  it('shows Add to merge queue on an open pull request that can join, for a member with write access, beside the main action', () => {
    const add = (
      state: BannerState,
      input: Partial<Omit<BarInput, 'snapshot'>> = {},
    ) => {
      const bar = view(state, undefined, input)
      return { actions: kinds(bar), add: bar.queue?.add ?? false }
    }
    expect(add('checks-failed')).toEqual({ actions: ['fix-checks'], add: true })
    expect(add('checks-running')).toEqual({ actions: [], add: true })
    expect(add('ready-to-merge').add).toBe(true)
    expect(add('merged').add).toBe(false)
    expect(add('none').add).toBe(false)
    expect(
      add('checks-running', {
        capabilities: {
          status: 'ready',
          capabilities: { canWrite: false, mergeMethod: null },
        },
      }).add,
    ).toBe(false)
    expect(add('checks-running', { readOnly: true }).add).toBe(false)
    expect(
      add('checks-running', { queue: { ...canJoin, listed: true } }).add,
    ).toBe(false)
    expect(
      add('checks-running', { queue: { ...canJoin, canJoin: false } }).add,
    ).toBe(false)
  })

  it('asks for a rebase in Resolve conflicts while the workspace is queued', () => {
    const oldBase = 'a'.repeat(40)
    const snapshot = {
      ...snapshotOf('conflict'),
      queue: { ...entry, rebase: { base: 'the-layer-below', oldBase } },
    }
    const prompt = promptOf('resolve-conflicts', snapshot)
    expect(prompt).toContain('the merge queue needs a linear history')
    expect(prompt).toContain(`git rebase --onto FETCH_HEAD ${oldBase}`)
    expect(prompt).toContain('git push --force-with-lease --force-if-includes')
    expect(promptOf('resolve-conflicts', snapshotOf('conflict'))).toContain(
      'merge it into this branch',
    )
    expect(
      promptOf('resolve-conflicts', { ...snapshot, queue: entry }),
    ).toContain('If you cannot verify the fetched base, stop and say so')
  })

  it('shows the masked trunk even while GitHub names a different base', () => {
    const queue = {
      ...entry,
      state: 'merging' as const,
      trunk: 'main-secret123',
      trunkLabel: { text: 'main-[redacted]' },
    }
    const bar = view('ready-to-merge', queue)
    expect(bar.queue?.line?.text).toBe(
      'Place 3 of 3 in the merge queue. Merging into main-[redacted].',
    )
  })
})
