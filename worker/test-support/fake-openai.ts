import { FakeModelUpstream } from './fake-model-upstream'

export class FakeOpenAI extends FakeModelUpstream {
  constructor() {
    super('https://api.openai.com', ['/v1/responses'], () =>
      Response.json({ object: 'response', output: [] }),
    )
  }
}
