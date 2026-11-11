import { FakeModelUpstream } from './fake-model-upstream'

export class FakeAnthropic extends FakeModelUpstream {
  constructor() {
    super(
      'https://api.anthropic.com',
      ['/v1/messages', '/v1/messages/count_tokens'],
      () => Response.json({ type: 'message', content: [] }),
    )
  }
}
