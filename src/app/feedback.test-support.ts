import { FEEDBACK_PATH, type SendFeedbackRequest } from '../shared/feedback'
import { FakeApiServer } from '../test-support/fake-api'
import { fakeUser } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { HeldRequests, testServices } from './test-kit'

export const feedbackLocation = {
  orgId: 'acme',
  workspaceId: 'checkout-autocomplete',
  desktop: false,
}
export const feedbackScreenshot = {
  name: 'screen.png',
  sizeBytes: 8,
  content: 'iVBORw0KGgo=',
}
export const feedbackFailure = {
  error: {
    code: 'feedback_email_failed',
    message: 'The feedback email could not be sent. Try again.',
  },
}

export function feedbackFixture() {
  const server = new FakeApiServer()
  server.json('GET', FEEDBACK_PATH, { replyEmail: 'mira@example.com' })
  server.empty('POST', FEEDBACK_PATH)
  const held = new HeldRequests(server)
  const services = testServices(server, {
    fetch: held.fetch,
    appVersion: '0.5.0 (abcd123)',
    platform: 'mac',
  })
  const app = new AppModel(services)
  app.boot.set({ state: 'ready', user: fakeUser })
  const sent = () =>
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === FEEDBACK_PATH,
    )
  const bodies = async (): Promise<SendFeedbackRequest[]> =>
    Promise.all(sent().map((request) => request.clone().json()))
  return { server, held, services, app, model: app.feedback, sent, bodies }
}
