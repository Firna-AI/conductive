import { expect, it } from 'vitest'
import { serveMaskedHead } from '../../test-support/fake-branch-names'
import {
  MASKED_HEAD,
  MASKED_MOVED,
} from '../../test-support/fixtures/masked-paths'
import { chatFor, newSessionRecord } from '../state/test-kit'
import { sessionMarkup } from './render-kit'
import type { GitHubBranch } from './SessionStatus'

it('names the workspace branch of its own record by its real name while the host gives the GitHub state of another branch, or of that branch without a label', async () => {
  const chat = chatFor()
  await serveMaskedHead(chat.server)
  await chat.controller.start()
  chat.emit({
    type: 'session.updated',
    session: newSessionRecord('fresh', {
      agent: 'claude',
      model: 'Opus 5.5',
      effort: 'high',
      fast: false,
    }),
  })
  await chat.controller.select('fresh')
  /** The text under the title of the empty state of the new session. */
  const newSessionText = (github: GitHubBranch) => {
    const markup = sessionMarkup(chat.controller, {
      host: {
        starting: null,
        sandboxBar: null,
        keepsComposer: false,
        github,
      },
    })
    return /<h2[^>]*>New session<\/h2><p[^>]*>([^<]*)<\/p>/.exec(markup)?.[1]
  }

  // The record of the app moved to the new branch of a repository change
  // first, so its GitHub state names a branch that the chat does not show.
  const text =
    'The agent works on calummoore/checkout-acme-7f3k, on the same cloud computer as the other sessions.'
  expect([
    newSessionText(MASKED_MOVED),
    newSessionText({ branch: MASKED_HEAD.branch }),
  ]).toEqual([text, text])
})
