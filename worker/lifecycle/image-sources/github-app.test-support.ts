import { generateKeyPairSync } from 'node:crypto'

export const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
export const privateKey = keys.privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString()
export const repository = {
  id: 'source',
  orgId: 'org',
  fullName: 'example/source',
  defaultBranch: 'main',
  githubRepositoryId: 101,
  installationId: 701,
}
export const now = () => 1_800_000_000_000
export const accessFailure = new Error('Installation access is not available')
export const revokeFailure = new Error(
  'Installation access could not be revoked',
)

export function heldGitHubFetch() {
  let entered: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    entered = resolve
  })
  let captured: Request | undefined
  let complete: (response: Response) => void = () => {}
  return {
    ready,
    request: () => {
      if (!captured) throw new Error('The GitHub request has not started.')
      return captured
    },
    fetch: (request: Request) =>
      new Promise<Response>((resolve, reject) => {
        captured = request
        complete = resolve
        request.signal.addEventListener(
          'abort',
          () => reject(new Error('private upstream token detail')),
          { once: true },
        )
        entered()
      }),
    reply: (response: Response) => complete(response),
  }
}
