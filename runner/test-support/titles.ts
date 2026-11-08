import { FakeChild } from './child'
import { FakeClaudeQuery } from './claude-query'
import type { ClaudeQueryFactory } from '../src/providers/claude'
import type { TitleRequest, TitleRequestOptions } from '../src/providers/title'
import { deferred } from './runtime'

export class FakeTitles {
  readonly requests: TitleRequestOptions[] = []
  answer = 'Change the workspace file'
  reply: TitleRequest = async () => this.answer
  readonly request: TitleRequest = async (options) => {
    this.requests.push(options)
    return this.reply(options)
  }
  readonly agents = { claude: this.request, codex: this.request }
}

export function titleQuery() {
  const sdk = new FakeClaudeQuery()
  const child = new FakeChild()
  child.exitOnSignal = 'SIGTERM'
  const opened = deferred<void>()
  const start: ClaudeQueryFactory = (parameters) => {
    parameters.options?.spawnClaudeCodeProcess?.({
      command: '/pinned/claude',
      args: [],
      cwd: parameters.options.cwd ?? '/repo',
      env: parameters.options.env ?? {},
      signal: new AbortController().signal,
    })
    opened.resolve()
    return sdk.open(parameters)
  }
  return { sdk, child, start, opened }
}
