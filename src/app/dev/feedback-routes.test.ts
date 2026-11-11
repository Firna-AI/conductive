import { expect, it } from 'vitest'

import { FEEDBACK_PATH } from '../../shared/feedback'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { ignore } from '../api/parse'
import { readFeedback } from '../api/read-feedback'
import { createBackend, guardScope } from './backend'
import { feedbackRoutes } from './feedback-routes'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

it('serves reply and send previews with success, no reply address, a first-send failure, and waiting-account refusal', async () => {
  const api = (search: string) => {
    const options = readDevOptions(search)
    const backend = createBackend(
      seedState(options),
      new FakeWorkspaceEvents([]),
      () => FAKE_TIME,
      () => 'unused',
    )
    return createApiClient(
      routeFetch(
        feedbackRoutes(backend, options),
        (path, method) => guardScope(backend.state, path, method),
        new FakeApiServer().fetch,
      ),
    )
  }
  const works = api('')
  expect(await works.get(FEEDBACK_PATH, readFeedback)).toEqual({
    replyEmail: 'calummoore@example.com',
  })
  await expect(
    works.send('POST', FEEDBACK_PATH, {}, ignore),
  ).resolves.toBeUndefined()
  const none = api('?feedback=no-email')
  expect(await none.get(FEEDBACK_PATH, readFeedback)).toEqual({
    replyEmail: null,
  })
  await expect(
    none.send('POST', FEEDBACK_PATH, {}, ignore),
  ).resolves.toBeUndefined()
  const fails = api('?feedback=fail')
  await expect(
    fails.send('POST', FEEDBACK_PATH, {}, ignore),
  ).rejects.toMatchObject({ status: 502, code: 'feedback_email_failed' })
  await expect(
    fails.send('POST', FEEDBACK_PATH, {}, ignore),
  ).resolves.toBeUndefined()
  const waiting = api('?waiting=1')
  await expect(waiting.get(FEEDBACK_PATH, readFeedback)).rejects.toMatchObject({
    status: 403,
    code: 'access_required',
  })
  await expect(
    waiting.send('POST', FEEDBACK_PATH, {}, ignore),
  ).rejects.toMatchObject({ status: 403, code: 'access_required' })
})
