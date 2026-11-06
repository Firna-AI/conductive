import type { HttpFetch } from '../../env'

export function repositoryUrl(fullName: string): string {
  const parts = fullName.split('/')
  if (
    parts.length !== 2 ||
    parts.some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Invalid GitHub repository name')
  }
  return `https://github.com/${parts.map(encodeURIComponent).join('/')}.git`
}

export async function gitRequest(
  fetch: HttpFetch,
  url: string,
  token: string,
  body?: string,
): Promise<Response> {
  const resultType = body === undefined ? 'advertisement' : 'result'
  const response = await fetch(
    new Request(url, {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Basic ${btoa(`x-access-token:${token}`)}`,
        Accept: `application/x-git-upload-pack-${resultType}`,
        ...(body === undefined
          ? {}
          : {
              'Content-Type': 'application/x-git-upload-pack-request',
            }),
        'User-Agent': 'Conducting',
        'Cache-Control': 'no-cache',
      },
      body,
    }),
  )
  const contentType = response.headers.get('Content-Type')?.split(';')[0].trim()
  if (
    response.status !== 200 ||
    contentType !== `application/x-git-upload-pack-${resultType}` ||
    !response.body
  ) {
    await response.body?.cancel()
    throw new Error('GitHub source is not available')
  }
  return response
}
