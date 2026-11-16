import { expect, it } from 'vitest'
import { promptOf } from './barPrompts'
import { snapshotOf } from './testing'

it('names the pull request, the target, the blocking checks in GitHub order, and the reviewers, or a reviewer whom GitHub no longer names', () => {
  const failed = snapshotOf('checks-failed')
  const checks = failed.checks.checks.map((check, index) =>
    index === 0
      ? { ...check, name: 'deploy', state: 'cancelled' as const }
      : check,
  )
  const review = snapshotOf('changes-requested')
  const reviewers = (logins: readonly string[]) => {
    if (review.banner.pullRequest === null) throw new Error('No pull request')
    return promptOf('address-review', {
      ...review,
      banner: { ...review.banner, changesRequestedBy: logins },
    })
  }
  const addressReview = [
    'Address the requested changes on this pull request.',
    '',
    'Read the open review comments with `gh`, make the changes, then commit and push. If `gh` is missing or fails, stop and say that `gh` failed.',
  ].join('\n')

  expect([
    promptOf('create-pull-request', snapshotOf('none')),
    promptOf('fix-checks', {
      ...failed,
      checks: { state: 'available', checks },
    }),
    reviewers(['priyaraman', 'jonas']),
    reviewers([]),
  ]).toEqual([
    [
      'Open a pull request for this branch.',
      '',
      'Commit the changes that are not committed, and push this branch. Use `gh pr create`, with the target branch below as the base. Write a short title, and describe what changed and why. If `gh` is missing or fails, push the branch and say that `gh` failed.',
      '',
      '---',
      'Target branch: main',
      "Don't reply on GitHub.",
    ].join('\n'),
    [
      'Fix the failed checks of this pull request.',
      '',
      'Find out why the checks below failed. Use `gh pr checks`, and read the logs of failed GitHub Actions jobs with `gh run view --log-failed`. For a check from another service, read its details, or run it locally. Fix the cause, then commit and push. If `gh` is missing or fails, run the failed checks locally, and say that `gh` failed.',
      '',
      '---',
      'Pull request: #482',
      'Failed checks: deploy, lint, and e2e (chromium)',
      "Don't reply on GitHub.",
    ].join('\n'),
    [
      addressReview,
      '',
      '---',
      'Pull request: #482',
      'Requested changes: @priyaraman and @jonas',
      "Don't reply on GitHub.",
    ].join('\n'),
    [
      addressReview,
      '',
      '---',
      'Pull request: #482',
      'Requested changes: A reviewer',
      "Don't reply on GitHub.",
    ].join('\n'),
  ])
})

it('asks for a commit and a push when files are not committed, and only for a push when only commits are left', () => {
  const ready = snapshotOf('ready-to-merge')
  expect([promptOf('commit-and-push', ready), promptOf('push', ready)]).toEqual(
    [
      "Commit the changes that are not committed, with a clear message, and push this branch.\n\n---\nDon't reply on GitHub.",
      "Push this branch.\n\n---\nDon't reply on GitHub.",
    ],
  )
})
