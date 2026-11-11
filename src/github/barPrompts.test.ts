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

  expect([
    promptOf('create-pull-request', snapshotOf('none')),
    promptOf('fix-checks', {
      ...failed,
      checks: { state: 'available', checks },
    }),
    reviewers(['priyaraman', 'jonas']),
    reviewers([]),
  ]).toEqual([
    'Commit the changes that are not committed, push this branch, and open a pull request into `main` with `gh pr create`. Write a short title, and describe what changed and why. If `gh` is missing or fails, push the branch and say that `gh` failed.',
    'These checks failed on pull request #482: deploy, lint, and e2e (chromium). Find out why with `gh pr checks 482`, and read the logs of failed GitHub Actions jobs with `gh run view --log-failed`. For a check from another service, read its details, or run it locally. Fix the cause, then commit and push. If `gh` is missing or fails, run the failed checks locally, and say that `gh` failed.',
    "@priyaraman and @jonas requested changes on pull request #482. Read the open review comments with `gh`, make the changes, then commit and push. Don't reply on GitHub. If `gh` is missing or fails, stop and say that `gh` failed.",
    "A reviewer requested changes on pull request #482. Read the open review comments with `gh`, make the changes, then commit and push. Don't reply on GitHub. If `gh` is missing or fails, stop and say that `gh` failed.",
  ])
})
