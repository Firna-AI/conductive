import { describe, expect, it } from 'vitest'
import { toolFixtures } from '../test-support/fixtures/tools'
import { localWorkOf } from './barView'

describe('the local work of a changes report', () => {
  it('counts each file that is not committed, also one that the net list leaves out, and each unpushed commit, tells only commits from changed files, and reads only the files of a report with no counts', () => {
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
    ]).toEqual([
      'unknown',
      'none',
      'commits',
      'changes',
      'none',
      'changes',
      'none',
      'commits',
    ])
  })
})
