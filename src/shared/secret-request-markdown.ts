import type { SecretGrant } from './generated/SecretGrant'
import type {
  SecretRequest,
  SecretWorkspaceEvent,
  SecretRequestEnd,
  SecretNoticeFailure,
  SecretValueLifetime,
} from './secret-requests'
import { codeBlock, inlineCode, plainText } from './transcript/markdown-code'

const endedText: Record<SecretRequestEnd, string> = {
  archived: 'The workspace was archived.',
  'org-suspended': 'The org was suspended.',
  'owner-suspended': 'The workspace owner was suspended.',
  'session-closed': 'The session was closed.',
}
const noticeText: Record<SecretNoticeFailure, string> = {
  'login-not-shared':
    'The agent learns of this when the session starter shares the login or sends a message in this session.',
  'login-unavailable':
    'The session starter must connect the login again and send a message so the agent learns of this.',
  'sender-unavailable':
    'The original sender no longer has access. The agent learns of this at the next message in this session.',
}
const lifetimeText: Record<SecretValueLifetime, string> = {
  '15-minutes': '15 minutes in this session',
  workspace: 'This workspace, until Archive or removal',
  save: 'Saved as an org secret and allowed for this session',
}
const grantText: Record<SecretGrant, string> = {
  'all-agents': 'All agents',
  workspace: 'Pre-approved for this workspace',
  session: 'Allowed for this session',
  '15-minutes': '15 minutes in this session',
  'workspace-value': 'Value for this workspace',
}

export function secretRequestMarkdown(request: SecretRequest): string {
  const name =
    request.answeredBy?.displayName ??
    request.answeredBy?.githubLogin ??
    'A member'
  const outcome =
    request.state === 'denied'
      ? `${name} denied the request. The command did not run.`
      : request.state === 'allowed'
        ? `${name} allowed the request.`
        : request.state === 'not-answered'
          ? `Not answered. ${request.endedBy ? endedText[request.endedBy] : ''}`
          : request.state === 'late'
            ? 'The agent stopped waiting. Allow sends it a message.'
            : 'Waiting for an answer.'
  const fallback =
    request.notice?.state === 'not-sent'
      ? noticeText[request.notice.reason]
      : ''
  return [
    `Secrets: ${request.secrets.map((secret) => inlineCode(secret.name)).join(', ')}`,
    ...request.secrets
      .filter((secret) => secret.description)
      .map(
        (secret) =>
          `${inlineCode(secret.name)}: ${plainText(secret.description)}`,
      ),
    plainText(request.reason),
    'Command that the agent says it will run:',
    codeBlock(request.command),
    plainText(outcome),
    ...(request.lifetime
      ? [`Available: ${lifetimeText[request.lifetime]}.`]
      : []),
    fallback,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function secretRunMarkdown(
  event: Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>,
): string {
  return [
    `Secrets: ${event.names.map(inlineCode).join(', ')}`,
    plainText(event.reason),
    'Command that the agent says it will run:',
    codeBlock(event.command),
    `Allowed: ${event.grants.map((item) => `${inlineCode(item.name)} · ${grantText[item.grant]}`).join(', ')}.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
