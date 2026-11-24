import { boatRoute } from '../sandbox/routes'

export function boatCommandRequests(
  requests: readonly Request[],
  sandboxId: string,
) {
  const command = boatRoute({ operation: 'command', sandboxId })
  return {
    commands: requests.filter(
      (request) =>
        request.method === command.method &&
        new URL(request.url).pathname.endsWith(command.path),
    ),
    statuses: requests.filter(
      (request) =>
        request.method === 'GET' &&
        new URL(request.url).pathname.includes(`${command.path}/`),
    ),
  }
}

export function boatAccountHeaders(requests: readonly Request[]) {
  return requests.map((request) => request.headers.get('X-Boat-Org'))
}
