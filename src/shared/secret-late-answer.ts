import type { SecretRequest } from './secret-requests'

/** The names of a request that the org has no secret for. */
export function missingNames(request: SecretRequest): string[] {
  return request.secrets
    .filter((secret) => secret.secretId === null)
    .map((secret) => secret.name)
}

/** A part of the line of a late answer: words, then the names in code. */
export interface LateAnswerPart {
  lead: string
  names: readonly string[]
  tail: string
}

/**
 * The line of a late Allow (secrets decision 10 B): the member who
 * answered, each secret, and what the answer gives, never a value. A
 * request that also names secrets of the org says that they are allowed
 * for the session too. The chat shows these parts, with "You" for the
 * person signed in. The agent gets the same words with the member's name,
 * so the two texts cannot drift apart.
 */
export function lateAnswerParts(
  request: SecretRequest,
  who: string,
  org: string,
): LateAnswerPart[] {
  const all = request.secrets.map((secret) => secret.name)
  const missing = missingNames(request)
  const stored = all.filter((name) => !missing.includes(name))
  const also = stored.length
    ? [
        {
          lead: `${who} also allowed`,
          names: stored,
          tail: 'for this session.',
        },
      ]
    : []
  switch (request.lifetime) {
    case null:
      return [{ lead: `${who} allowed`, names: all, tail: 'for this session.' }]
    case '15-minutes':
      return [
        { lead: `${who} gave`, names: missing, tail: 'for 15 minutes.' },
        ...also,
      ]
    case 'workspace':
      return [
        { lead: `${who} gave`, names: missing, tail: 'for this workspace.' },
        ...also,
      ]
    case 'save': {
      const kind = missing.length === 1 ? 'a secret' : 'secrets'
      return [
        { lead: `${who} saved`, names: missing, tail: `as ${kind} of ${org}.` },
        ...also,
      ]
    }
  }
}

/** The parts of a late answer line as one plain text, for the agent. */
export function lateAnswerText(parts: readonly LateAnswerPart[]): string {
  return parts
    .map((part) => `${part.lead} ${part.names.join(', ')} ${part.tail}`)
    .join(' ')
}
