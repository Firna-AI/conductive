import type { ChatFixture } from './harness.test-support'
import type { NativeQuery } from '../test-support/native-d1'

export type LoginQuery = NativeQuery

export async function captureLoginQueries(
  fixture: ChatFixture,
): Promise<LoginQuery[]> {
  const queries: LoginQuery[] = []
  await fixture.observeQueries(async (query) => {
    queries.push(query)
  })
  return queries
}
