/**
 * The `unexpected_error` warning: what the log may keep about an exception
 * that no route expected. It keeps no message, no ID, and no path segment
 * of user data, because a message can quote a secret or a request body.
 */

/** The built-in error names. Any other name logs as `Error`. */
const ERROR_NAMES = [
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
  'AbortError',
  'TimeoutError',
  'DataCloneError',
  'InvalidStateError',
  'NotSupportedError',
  'OperationError',
  'QuotaExceededError',
] as const

/** Known texts of the Cloudflare runtime. The log keeps only the kind. */
const KNOWN_TEXTS = [
  ['code_updated', /Durable Object\b.*\bcode (?:was|has been) updated/i],
  ['memory_limit', /exceeded its memory limit/i],
  ['cpu_limit', /exceeded (?:its )?CPU/i],
  ['storage_timeout', /storage operation exceeded timeout/i],
  ['network_lost', /Network connection lost/i],
  ['overloaded', /overloaded/i],
  ['subrequest_limit', /Too many (?:subrequests|API requests)/i],
] as const

/** The words of the API routes. Every other path segment logs as `*`. */
const ROUTE_WORDS: ReadonlySet<string> = new Set(
  `accept account activity agent-logins all-agents answer api approval
  archive attachments auth automations builds callback capabilities changes
  checks claude close code codex complete connect continue count credential
  current default-model delete desktop device device-commands devices
  disable events feedback files get-started git github github-installations
  github-repositories github-setup health history image install installed
  interrupt invite-codes invites join leave logout mac-command members merge
  messages model models move new-workspace-view operator org-order orgs
  overview owner parts previews read ready refresh rename reopen
  repositories requested responses restart restore restore-ended resume
  retry reveal run run-now runner runs secret-requests secret-values secrets
  sections session sessions settings setup shortcuts signup-pause socket
  stats stop stored suspension terminal terms-consent tools transcript tree
  uploads users v1 view waitlist waitlist-switch webhooks workspaces`.split(
    /\s+/,
  ),
)

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

const MAX_SEGMENTS = 12
const MAX_FRAMES = 8

/** A stack line with only a code place, such as `at f (index.js:10:4)`. */
const FRAME =
  /^ {4}at (?:async )?(?:new )?(?:[\w$.]+(?: \[as [\w$]+\])? \()?[\w./@-]+:\d+:\d+\)?$/

type ErrorName = (typeof ERROR_NAMES)[number]
type KnownText = (typeof KNOWN_TEXTS)[number][0]

export interface UnexpectedErrorFields {
  errorName: ErrorName | 'unknown'
  knownText: KnownText | null
  retryable: boolean
  overloaded: boolean
  durableObjectReset: boolean
  method: string | null
  route: string | null
  frames: string[]
}

function flag(error: unknown, name: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>)[name] === true
  )
}

/** The code places of the stack. A stack that does not start with its own name and message gives none. */
function frames(error: Error): string[] {
  const head = error.message ? `${error.name}: ${error.message}` : error.name
  const stack = typeof error.stack === 'string' ? error.stack : ''
  if (!stack.startsWith(`${head}\n`)) return []
  return stack
    .slice(head.length + 1)
    .split('\n')
    .filter((line) => FRAME.test(line))
    .slice(0, MAX_FRAMES)
    .map((line) => line.trim())
}

function route(request: Request): string | null {
  let path: string
  try {
    path = new URL(request.url).pathname
  } catch {
    return null
  }
  const segments = path.split('/').slice(1, MAX_SEGMENTS + 1)
  return `/${segments.map((part) => (ROUTE_WORDS.has(part) ? part : '*')).join('/')}`
}

/** The safe fields of an unexpected error, and of the request that met it. */
export function unexpectedErrorFields(
  error: unknown,
  request?: Request,
): UnexpectedErrorFields {
  const isError = error instanceof Error
  const message = isError ? error.message : ''
  return {
    errorName: isError
      ? (ERROR_NAMES.find((name) => name === error.name) ?? 'Error')
      : 'unknown',
    knownText: KNOWN_TEXTS.find(([, text]) => text.test(message))?.[0] ?? null,
    retryable: flag(error, 'retryable'),
    overloaded: flag(error, 'overloaded'),
    durableObjectReset: flag(error, 'durableObjectReset'),
    method: request
      ? (METHODS.find((method) => method === request.method) ?? 'other')
      : null,
    route: request ? route(request) : null,
    frames: isError ? frames(error) : [],
  }
}
