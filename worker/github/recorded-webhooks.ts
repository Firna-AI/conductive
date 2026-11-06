// Routing fields from octokit/webhooks payload-examples/api.github.com.
// Captured 6 November 2026. MIT license. See README for the source links.
// Each example uses the same test installation. Push targets a test branch.
const repository = { id: 186853002, full_name: 'Codertocat/Hello-World' }
const installation = { id: 1 }

export const recordedPush = {
  ref: 'refs/heads/changes',
  before: '6113728f27ae82c7b1a177c8d03f9e96e0adf246',
  after: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
  deleted: false,
  repository,
  installation,
}

export const recordedPullRequest = {
  action: 'opened',
  number: 2,
  pull_request: {
    number: 2,
    title: 'Update the README with new information',
    head: {
      ref: 'changes',
      sha: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
      repo: repository,
    },
    base: { ref: 'main', repo: repository },
  },
  repository,
  installation,
}

export const recordedReview = {
  action: 'submitted',
  review: { state: 'changes_requested', user: { login: 'reviewer' } },
  pull_request: recordedPullRequest.pull_request,
  repository,
  installation,
}

export const recordedCheckRun = {
  action: 'completed',
  check_run: {
    id: 128620228,
    head_sha: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
    status: 'completed',
    conclusion: 'success',
    pull_requests: [],
  },
  repository,
  installation,
}

export const recordedCheckSuite = {
  action: 'completed',
  check_suite: {
    id: 118578147,
    head_branch: 'changes',
    head_sha: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
    status: 'completed',
    conclusion: 'success',
    pull_requests: [],
  },
  repository,
  installation,
}

export const recordedStatus = {
  id: 1,
  sha: '6113728f27ae82c7b1a177c8d03f9e96e0adf246',
  state: 'success',
  context: 'continuous-integration/jenkins',
  branches: [],
  repository,
  installation,
}
