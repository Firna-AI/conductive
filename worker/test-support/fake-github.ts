import type { HttpFetch } from '../env'

export class FakeGitHub {
  requests: Request[] = []
  profile: unknown = defaultProfile()
  tokenStatus = 200
  profileStatus = 200

  reset() {
    this.requests = []
    this.profile = defaultProfile()
    this.tokenStatus = 200
    this.profileStatus = 200
  }

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
    const url = new URL(request.url)
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
