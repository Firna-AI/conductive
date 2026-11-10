import type { HttpFetch } from '../env'

export class FakeGitHub {
  requests: Request[] = []
  profile: unknown = defaultProfile()
  tokenStatus = 200
  profileStatus = 200
  emails: unknown = []
  emailPages: readonly unknown[] | null = null
  emailsStatus = 200
  accounts = new Map<string, { id: number; login: string }>()

  reset() {
    this.requests = []
    this.profile = defaultProfile()
    this.tokenStatus = 200
    this.profileStatus = 200
    this.emails = []
    this.emailPages = null
    this.emailsStatus = 200
    this.accounts.clear()
  }

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
    const url = new URL(request.url)
    if (
      url.origin === 'https://api.github.com' &&
      url.pathname.startsWith('/users/')
    ) {
      const login = decodeURIComponent(
        url.pathname.slice('/users/'.length),
      ).toLowerCase()
      const account = this.accounts.get(login)
      return Response.json(account ?? { message: 'Not Found' }, {
        status: account ? 200 : 404,
      })
    }
    if (
      url.origin === 'https://github.com' &&
      url.pathname === '/login/oauth/access_token'
    ) {
      return Response.json(
        { access_token: 'github-test-token', token_type: 'bearer' },
        { status: this.tokenStatus },
      )
    }
    if (url.origin === 'https://api.github.com' && url.pathname === '/user') {
      return Response.json(this.profile, { status: this.profileStatus })
    }
    if (
      url.origin === 'https://api.github.com' &&
      url.pathname === '/user/installations'
    ) {
      return Response.json({ total_count: 0, installations: [] })
    }
    if (
      url.origin === 'https://api.github.com' &&
      url.pathname === '/user/emails'
    ) {
      const page = Number(url.searchParams.get('page') ?? '1')
      const headers = new Headers()
      if (this.emailPages && page < this.emailPages.length) {
        headers.set(
          'Link',
          `<https://api.github.com/user/emails?per_page=100&page=${page + 1}>; rel="next"`,
        )
      }
      return Response.json(this.emailPages?.[page - 1] ?? this.emails, {
        status: this.emailsStatus,
        headers,
      })
    }
    throw new Error('Unexpected GitHub request')
  }
}

function defaultProfile() {
  return {
    id: 7,
    login: 'octocat',
    name: 'Octocat',
    avatar_url: null,
  }
}
