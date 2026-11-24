import { HttpError } from '../http'

const computerCodePattern =
  /^(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/
const computerTokenPattern = /^cndc1\.([0-9a-f]{64})\.[A-Za-z0-9_-]{43}$/

export function credentialRequired() {
  return new HttpError(
    401,
    'computer_credential_required',
    'The connection is not available.',
  )
}

function rejectBrowser(request: Request): void {
  if (request.headers.has('Origin') || request.headers.has('Cookie'))
    throw new HttpError(
      403,
      'computer_forbidden',
      'The connection is not available.',
    )
}

function computerBearer(request: Request): string {
  const token = request.headers
    .get('Authorization')
    ?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) throw credentialRequired()
  return token
}

export function computerEnrollmentCode(request: Request): string {
  rejectBrowser(request)
  const code = computerBearer(request)
  if (!computerCodePattern.test(code)) throw credentialRequired()
  return code
}

export function computerWebSocketToken(request: Request) {
  rejectBrowser(request)
  if (
    request.method !== 'GET' ||
    request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
  )
    throw new HttpError(
      426,
      'websocket_required',
      'Open a new connection to continue.',
    )
  const token = computerBearer(request)
  const objectId = computerTokenPattern.exec(token)?.[1]
  if (!objectId) throw credentialRequired()
  return { token, objectId }
}
