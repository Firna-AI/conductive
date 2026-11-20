import { githubPaths } from '../shared/github'
import type { FakeApiServer } from './fake-api'
import { FAKE_IDS } from './fixtures/core'

/*
 * The replies of Ready for review in the pull request bar, for tests and
 * the development pages. Each one follows the contract of the Worker.
 */

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

function refusal(code: string, message: string) {
  return { error: { code, message } }
}

/** How Ready for review of the fake ends. */
export type FakeReadyEnd = 'ready' | 'no-right' | 'pull-changed' | 'refused'

/** The reply of Ready for review, with the Worker's safe words. */
export function serveReady(server: FakeApiServer, end: FakeReadyEnd): void {
  const path = githubPaths.ready(org, id)
  switch (end) {
    case 'ready':
      server.json('POST', path, { state: 'ready' })
      return
    case 'no-right':
      server.json(
        'POST',
        path,
        refusal(
          'github_ready_forbidden',
          "Not marked ready: your GitHub access doesn't allow changes to this pull request.",
        ),
        403,
      )
      return
    case 'pull-changed':
      server.json(
        'POST',
        path,
        refusal(
          'github_pull_changed',
          'Not marked ready: the branch has another pull request now. Review it, then try again.',
        ),
        409,
      )
      return
    case 'refused':
      server.json(
        'POST',
        path,
        refusal(
          'github_ready_refused',
          'Not marked ready: GitHub refused the change.',
        ),
        409,
      )
  }
}
