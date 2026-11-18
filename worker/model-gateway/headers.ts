import type { AgentLogin } from '../chat/login-kind'

const requestNames = new Set([
  'accept',
  'accept-encoding',
  'content-type',
  'content-encoding',
  'content-language',
  'user-agent',
  'x-app',
  'originator',
  'session-id',
  'thread-id',
  'x-client-request-id',
  'x-codex-beta-features',
  'x-codex-turn-metadata',
  'x-codex-window-id',
])
const responseNames = new Set([
  'content-type',
  'retry-after',
  'x-should-retry',
  'request-id',
  'x-request-id',
])
const codexTokenRequestNames = new Set([
  ...requestNames,
  'chatgpt-account-id',
  'version',
  'x-codex-routing-hint',
  'x-codex-turn-state',
  'x-openai-subagent',
])
const codexTokenResponseNames = new Set([
  'etag',
  'x-models-etag',
  'x-codex-turn-state',
  'x-reasoning-included',
  'openai-model',
  'x-codex-safety-buffering-enabled',
  'x-codex-safety-buffering-faster-model',
])

function connectionHeaders(headers: Headers) {
  return new Set(
    (headers.get('connection') ?? '')
      .split(',')
      .map((name) => name.trim().toLowerCase()),
  )
}

export function hasClaudeMarkers(headers: Headers): boolean {
  return (
    headers.get('user-agent')?.startsWith('claude-cli/') === true &&
    (headers.get('anthropic-beta') ?? '')
      .split(',')
      .some((value) => value.trim() === 'claude-code-20250219')
  )
}

export function upstreamHeaders(headers: Headers, login: AgentLogin): Headers {
  const result = new Headers()
  const connection = connectionHeaders(headers)
  const tokenMode = login.agent === 'codex' && login.kind === 'token'
  headers.forEach((value, name) => {
    if (
      !connection.has(name) &&
      (tokenMode
        ? codexTokenRequestNames.has(name)
        : requestNames.has(name) ||
          name.startsWith('anthropic-') ||
          name.startsWith('x-claude-code-') ||
          name.startsWith('x-stainless-'))
    )
      result.set(name, value)
  })
  if (login.agent === 'claude' && login.kind !== 'token') {
    result.set('x-api-key', login.secret)
    const beta = result.get('anthropic-beta')
    if (beta !== null)
      result.set(
        'anthropic-beta',
        beta
          .split(',')
          .filter((value) => value.trim() !== 'oauth-2025-04-20')
          .join(','),
      )
  } else result.set('authorization', `Bearer ${login.secret}`)
  return result
}

export function downstreamHeaders(
  headers: Headers,
  secrets: readonly string[],
  codexToken = false,
): Headers {
  const result = new Headers()
  const connection = connectionHeaders(headers)
  headers.forEach((value, name) => {
    if (
      !connection.has(name) &&
      (responseNames.has(name) ||
        (codexToken && codexTokenResponseNames.has(name)) ||
        name.startsWith('anthropic-ratelimit-') ||
        name.startsWith('x-ratelimit-'))
    )
      result.set(
        name,
        secrets
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)
          .reduce(
            (text, secret) => text.replaceAll(secret, '[redacted]'),
            value,
          ),
      )
  })
  return result
}
