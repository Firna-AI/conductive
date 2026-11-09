import type { UserMessage } from '../../../src/shared/messages'

export function providerMessage(message: UserMessage): string {
  const login = message.sender.githubLogin.replace(/\s+/gu, ' ').trim()
  const name = message.sender.displayName?.replace(/\s+/gu, ' ').trim()
  const sender = name ? `${name} (@${login})` : `@${login}`
  return `Sender: ${sender}\n\n${message.text}`
}
