import { expect, it } from 'vitest'

import { recordedPullRequest } from './recorded-webhooks'
import { webhookRoute } from './webhook-routing'

const pull = recordedPullRequest.pull_request
const stacked = {
  ...recordedPullRequest,
  action: 'stacked',
  stack: {
    id: 10015,
    number: 15,
    base: { ref: 'main', sha: 'main-commit' },
    size: 3,
    position: 2,
  },
}
const edited = {
  ...recordedPullRequest,
  action: 'edited',
  changes: { base: { ref: { from: 'old-base' }, sha: { from: 'old-head' } } },
  pull_request: {
    ...pull,
    base: { ...pull.base, ref: 'new-base', sha: 'new-head' },
  },
}
const branchRoute = {
  repositoryId: 186853002,
  installationId: 1,
  push: false,
  branch: 'changes',
}

it('reads the top-level stack and keeps the branch route for a stacked event', () => {
  expect(webhookRoute('pull_request', stacked)).toEqual({
    ...branchRoute,
    pullRequestChange: {
      number: 2,
      stack: {
        id: 10015,
        number: 15,
        baseBranch: 'main',
        baseSha: 'main-commit',
        size: 3,
        position: 2,
      },
    },
  })
})

it('reads a stack membership that only has a base', () => {
  expect(
    webhookRoute('pull_request', {
      ...stacked,
      stack: { base: { ref: 'main', sha: 'main-commit' } },
    }),
  ).toEqual({
    ...branchRoute,
    pullRequestChange: {
      number: 2,
      stack: { baseBranch: 'main', baseSha: 'main-commit' },
    },
  })
})

it('distinguishes an explicit null stack from an absent stack', () => {
  expect(webhookRoute('pull_request', { ...stacked, stack: null })).toEqual({
    ...branchRoute,
    pullRequestChange: { number: 2, stack: null },
  })
  expect(
    webhookRoute('pull_request', { ...stacked, stack: undefined }),
  ).toEqual(branchRoute)
})

it('reads both base refs and SHAs in an edited event', () => {
  expect(webhookRoute('pull_request', edited)).toEqual({
    ...branchRoute,
    pullRequestChange: {
      number: 2,
      baseChange: {
        from: 'old-base',
        fromSha: 'old-head',
        to: 'new-base',
        toSha: 'new-head',
      },
    },
  })
})

it('keeps normal routing for an edit of the title alone', () => {
  expect(
    webhookRoute('pull_request', {
      ...edited,
      changes: { title: { from: 'Old title' } },
    }),
  ).toEqual(branchRoute)
})

it.each([
  ['stack', { ...stacked, stack: { ...stacked.stack, position: '2' } }],
  ['base change', { ...edited, changes: { base: { ref: {} } } }],
] as const)(
  'rejects malformed %s data with the webhook error',
  (_field, value) => {
    expect(() => webhookRoute('pull_request', value)).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'github_webhook_invalid',
        message: 'The GitHub webhook is not valid.',
      }),
    )
  },
)
