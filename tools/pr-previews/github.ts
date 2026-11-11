import type { ExternalIO } from './operations.ts'
import { array, httpJson, record, text } from './remote-values.ts'

export function environmentValue(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]
  if (!value?.trim()) throw new Error(`Missing preview setting: ${name}.`)
  return value
}

export class GitHub {
  readonly repository: string
  private readonly token: string
  private readonly io: ExternalIO
  constructor(
    environment: Readonly<Record<string, string | undefined>>,
    io: ExternalIO,
  ) {
    const parts = environmentValue(environment, 'GITHUB_REPOSITORY').split('/')
    if (parts.length !== 2 || parts.some((part) => !part))
      throw new Error('GITHUB_REPOSITORY must name owner/repository.')
    this.repository = parts.map(encodeURIComponent).join('/')
    this.token = environmentValue(environment, 'GITHUB_TOKEN')
    this.io = io
  }

  private async request(
    path: string,
    method = 'GET',
    body?: unknown,
    missing = false,
  ) {
    let more = false
    const value = await httpJson(
      async (request) => {
        const response = await this.io.fetch(request)
        more = /rel="next"/.test(response.headers.get('Link') ?? '')
        return response
      },
      new Request(`https://api.github.com/repos/${this.repository}${path}`, {
        method,
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'conductive-pr-previews',
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      'GitHub',
      missing,
    )
    return { value, more }
  }

  async pullState(number: number): Promise<'open' | 'closed' | 'missing'> {
    return (await this.pullRequest(number))?.state ?? 'missing'
  }

  async pullRequest(number: number): Promise<{
    state: 'open' | 'closed'
    headSha: string
  } | null> {
    const { value } = await this.request(
      `/pulls/${number}`,
      'GET',
      undefined,
      true,
    )
    if (value === null) return null
    const pull = record(value, 'GitHub pull request')
    const state = pull.state
    if (state !== 'open' && state !== 'closed')
      throw new Error('GitHub returned an invalid pull request state.')
    return {
      state,
      headSha: text(
        record(pull.head, 'GitHub pull request head').sha,
        'GitHub head SHA',
      ),
    }
  }

  async comments(number: number): Promise<Record<string, unknown>[]> {
    const comments: Record<string, unknown>[] = []
    for (let page = 1; ; page++) {
      const reply = await this.request(
        `/issues/${number}/comments?per_page=100&page=${page}`,
      )
      comments.push(
        ...array(reply.value, 'GitHub comments').map((entry) =>
          record(entry, 'GitHub comment'),
        ),
      )
      if (!reply.more) return comments
    }
  }

  async updateComment(id: number, body: string): Promise<void> {
    await this.request(`/issues/comments/${id}`, 'PATCH', { body })
  }

  async createComment(number: number, body: string): Promise<void> {
    await this.request(`/issues/${number}/comments`, 'POST', { body })
  }
}
