const FOOTER = '\n\n---\nSent by: '

export function agentToolMessage(
  text: string,
  sendingSessionLink: string,
): string {
  return `${text}${FOOTER}${sendingSessionLink}`
}

/** Only the exact final sending-session footer is excluded from title input. */
export function agentToolTaskText(text: string, appOrigin: string): string {
  const at = text.lastIndexOf(FOOTER)
  if (at < 0) return text
  try {
    const raw = text.slice(at + FOOTER.length)
    const url = new URL(raw)
    if (
      url.href === raw &&
      url.origin === appOrigin &&
      !url.search &&
      !url.hash &&
      /^\/orgs\/[^/]+\/workspaces\/[^/]+\/sessions\/[^/]+$/.test(url.pathname)
    )
      return text.slice(0, at)
  } catch {
    // Other final lines remain part of the task.
  }
  return text
}
