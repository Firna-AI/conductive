import { describe, expect, it } from 'vitest'
import type { BannerState } from '../shared/github'
import { toolFixtures } from '../test-support/fixtures/tools'
import { barViewOf, localWorkOf, type BarInput, type BarView } from './barView'
import { snapshotOf } from './testing'

const writer: BarInput['capabilities'] = {
  status: 'ready',
  capabilities: { canWrite: true, mergeMethod: 'squash' },
}

function view(
  state: BannerState,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
): BarView {
  return barViewOf({
    snapshot: snapshotOf(state),
    capabilities: writer,
    localWork: 'no',
    outcome: null,
    turnRuns: false,
    readOnly: false,
    archivable: true,
    ...input,
  })
}

/** The buttons of a view in words: the agent action, the method, or the kind. */
function buttons(bar: BarView): string[] {
  return bar.actions.map((action) => {
    switch (action.kind) {
      case 'agent':
        return action.action
      case 'merge':
        return `merge:${action.method}${action.busy ? ':busy' : ''}`
      case 'continue':
        return `continue${action.busy ? ':busy' : ''}${action.waiting ? ':waiting' : ''}`
      case 'archive':
        return `archive${action.disabled ? ':off' : ''}`
    }
  })
}

describe('the actions of the bar', () => {
  it('puts local work first, then each fix, then Merge, for a member with write access', () => {
    const cases: [string, BannerState, BarInput['localWork']][] = [
      ['commits on GitHub', 'none', 'no'],
      ['no commits, no work', 'no-commits', 'no'],
      ['no commits, local work', 'no-commits', 'yes'],
      ['failed checks', 'checks-failed', 'no'],
      ['failed checks, local work', 'checks-failed', 'yes'],
      ['conflict', 'conflict', 'no'],
      ['changes requested', 'changes-requested', 'no'],
      ['ready', 'ready-to-merge', 'no'],
      ['ready, local work', 'ready-to-merge', 'yes'],
      ['ready, report unknown', 'ready-to-merge', 'unknown'],
      ['running, local work', 'checks-running', 'yes'],
      ['draft', 'draft', 'no'],
      ['blocked', 'blocked', 'no'],
      ['closed, local work', 'closed', 'yes'],
      ['merged, local work', 'merged', 'yes'],
    ]
    expect(
      cases.map(([name, state, localWork]) => [
        name,
        buttons(view(state, { localWork })),
      ]),
    ).toEqual([
      ['commits on GitHub', ['create-pull-request']],
      ['no commits, no work', []],
      ['no commits, local work', ['create-pull-request']],
      ['failed checks', ['fix-checks']],
      ['failed checks, local work', ['commit-and-push']],
      ['conflict', ['resolve-conflicts']],
      ['changes requested', ['address-review']],
      ['ready', ['merge:squash']],
      ['ready, local work', ['commit-and-push']],
      ['ready, report unknown', []],
      ['running, local work', ['commit-and-push']],
      ['draft', []],
      ['blocked', []],
      ['closed, local work', []],
      ['merged, local work', ['continue', 'archive']],
    ])
  })

  it('gives a known reader no agent action and no Merge, and a failed read the agent actions only', () => {
    const reader: BarInput['capabilities'] = {
      status: 'ready',
      capabilities: { canWrite: false, mergeMethod: null },
    }
    const noMethod: BarInput['capabilities'] = {
      status: 'ready',
      capabilities: { canWrite: true, mergeMethod: null },
    }
    const access = (capabilities: BarInput['capabilities']) =>
      (['checks-failed', 'ready-to-merge', 'merged'] as const).map((state) =>
        buttons(view(state, { capabilities })),
      )
    expect({
      reader: access(reader),
      failed: access({ status: 'failed' }),
      loading: access({ status: 'loading' }),
      noMethod: access(noMethod),
    }).toEqual({
      reader: [[], [], ['continue', 'archive']],
      failed: [['fix-checks'], [], ['continue', 'archive']],
      loading: [[], [], ['continue', 'archive']],
      noMethod: [['fix-checks'], [], ['continue', 'archive']],
    })
  })

  it('shows only the links in an archived workspace or a suspended org, and Archive only when the member may archive', () => {
    const readOnly = (state: BannerState) => view(state, { readOnly: true })
    expect({
      readOnly: (['none', 'ready-to-merge', 'merged'] as const).map((state) => {
        const bar = readOnly(state)
        return [buttons(bar), bar.link?.label ?? null]
      }),
      member: buttons(view('merged', { archivable: false })),
    }).toEqual({
      readOnly: [
        [[], 'Create on GitHub'],
        [[], 'Open on GitHub'],
        [[], 'Open on GitHub'],
      ],
      member: ['continue'],
    })
  })

  it('names each refusal under Ready to merge, and the wait and the stop of Continue under the merged bar', () => {
    const refused = (
      reason: 'merge-moved-head' | 'merge-no-right' | 'merge-refused',
    ) => view('ready-to-merge', { outcome: { kind: 'merge-refused', reason } })
    const clash =
      'Continue stopped: the changed files clash with the latest main. The workspace stays on calummoore/checkout-autocomplete.'
    const message = (bar: BarView) => [buttons(bar), bar.message]
    expect([
      message(refused('merge-moved-head')),
      message(refused('merge-no-right')),
      message(refused('merge-refused')),
      message(
        view('ready-to-merge', {
          outcome: {
            kind: 'merge-failed',
            message:
              'The merge result is not available. Open the pull request on GitHub.',
          },
        }),
      ),
      message(view('merged', { turnRuns: true })),
      message(view('merged', { outcome: { kind: 'continue-waits' } })),
      message(
        view('merged', {
          outcome: { kind: 'continue-failed', message: clash },
        }),
      ),
      message(view('merged', { outcome: { kind: 'continuing' } })),
    ]).toEqual([
      [
        ['merge:squash'],
        {
          text: 'Not merged: the branch has new commits. Review them, then merge again.',
          tone: 'danger',
          href: null,
        },
      ],
      [
        [],
        {
          text: "Not merged: your GitHub access doesn't allow merges into main.",
          tone: 'danger',
          href: null,
        },
      ],
      [
        ['merge:squash'],
        {
          text: 'GitHub refused the merge.',
          tone: 'danger',
          href: 'https://github.com/acme/storefront/pull/482',
        },
      ],
      [
        ['merge:squash'],
        {
          text: 'The merge result is not available. Open the pull request on GitHub.',
          tone: 'danger',
          href: 'https://github.com/acme/storefront/pull/482',
        },
      ],
      [
        ['continue:waiting', 'archive'],
        {
          text: 'Continue waits for the agent to finish.',
          tone: 'status',
          href: null,
        },
      ],
      [
        ['continue', 'archive'],
        {
          text: 'Continue waits for the agent to finish.',
          tone: 'status',
          href: null,
        },
      ],
      [['continue', 'archive'], { text: clash, tone: 'danger', href: null }],
      [['continue:busy', 'archive:off'], null],
    ])
  })

  it('offers Fix checks only while the checks name a failed check, and counts a cancelled check as failed', () => {
    const failed = snapshotOf('checks-failed')
    const named = (states: readonly ('passed' | 'cancelled')[]) =>
      buttons(
        barViewOf({
          snapshot: {
            ...failed,
            checks: {
              state: 'available',
              checks: failed.checks.checks.map((check, index) => ({
                ...check,
                state: states[index] ?? 'passed',
              })),
            },
          },
          capabilities: writer,
          localWork: 'no',
          outcome: null,
          turnRuns: false,
          readOnly: false,
          archivable: true,
        }),
      )
    expect([named([]), named(['passed', 'cancelled'])]).toEqual([
      [],
      ['fix-checks'],
    ])
  })
})

describe('the local work of a changes report', () => {
  it('counts each file that is not committed, also one that the net list leaves out, and each unpushed commit, and reads only the files of a report with no counts', () => {
    const { changes } = toolFixtures()
    const clean = changes.files.map((file) => ({ ...file, uncommitted: false }))
    const { baseBranch, summary } = changes
    // An edit back to the base content leaves the net list empty. Git status
    // still holds the file, so the raw count of the runner does too.
    const restored = {
      baseBranch,
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    }
    expect([
      localWorkOf(null),
      localWorkOf({ ...changes, files: clean, unpushedCommits: 0 }),
      localWorkOf({ ...changes, files: clean, unpushedCommits: 2 }),
      localWorkOf({ ...changes, unpushedCommits: 0 }),
      localWorkOf({ baseBranch, summary, files: clean }),
      localWorkOf({ ...restored, uncommittedFileCount: 1, unpushedCommits: 0 }),
      localWorkOf({ ...restored, uncommittedFileCount: 0, unpushedCommits: 0 }),
      localWorkOf({ ...restored, uncommittedFileCount: 0, unpushedCommits: 2 }),
    ]).toEqual(['unknown', 'no', 'yes', 'yes', 'no', 'yes', 'no', 'yes'])
  })
})
