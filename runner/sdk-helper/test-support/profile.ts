import { randomUUID } from 'node:crypto'

export async function fakeClaudeProfile(home: string) {
  return {
    directory: `${home}/.conductive/anthropic/credentials/process-${randomUUID()}`,
    name: 'test-profile',
    remove: async () => {},
  }
}
