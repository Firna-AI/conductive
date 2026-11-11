type NativePart =
  { type: 'text'; text: string } | { type: 'tool'; name: string }

interface NativeMessage {
  role: 'user' | 'assistant' | null
  id: string | null
  hasText: boolean
  parts: NativePart[]
  occurredAt: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const nativeRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null

const timestamp = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Date.parse(value) : value
  return typeof parsed === 'number' &&
    Number.isSafeInteger(parsed) &&
    parsed >= 0
    ? parsed
    : null
}

const tool = (name: unknown): NativePart => ({
  type: 'tool',
  name:
    typeof name === 'string' && name.trim().length > 0
      ? name.replace(/\s+/gu, ' ').trim().slice(0, 80)
      : 'Unknown',
})

const contentParts = (
  value: unknown,
  agent: 'claude' | 'codex',
): NativePart[] => {
  if (typeof value === 'string')
    return value.length > 0 ? [{ type: 'text', text: value }] : []
  if (!Array.isArray(value)) return []
  const parts: NativePart[] = []
  for (const item of value) {
    const block = nativeRecord(item)
    if (!block) continue
    if (
      (block.type === 'text' ||
        (agent === 'codex' &&
          (block.type === 'input_text' || block.type === 'output_text'))) &&
      typeof block.text === 'string' &&
      block.text.length > 0
    )
      parts.push({ type: 'text', text: block.text })
    if (
      agent === 'claude' &&
      (block.type === 'tool_use' || block.type === 'server_tool_use')
    ) {
      parts.push(tool(block.name))
    }
  }
  return parts
}

export const nativeMessage = (
  value: unknown,
  agent: 'claude' | 'codex',
): NativeMessage | null => {
  const row = nativeRecord(value)
  if (!row) return null
  let role: NativeMessage['role'] = null
  let id: string | null = null
  let parts: NativePart[]
  if (agent === 'claude') {
    if (
      row.isSidechain === true ||
      row.teamName ||
      row.isMeta === true ||
      row.isCompactSummary === true
    )
      return null
    if (row.type !== 'user' && row.type !== 'assistant') return null
    const message = nativeRecord(row.message)
    if (!message) return null
    role = row.type
    id =
      typeof message.id === 'string'
        ? message.id
        : typeof row.uuid === 'string'
          ? row.uuid
          : null
    parts = contentParts(message.content, agent)
  } else {
    if (row.type !== 'response_item') return null
    const payload = nativeRecord(row.payload)
    if (!payload) return null
    if (
      payload.type === 'message' &&
      (payload.role === 'user' || payload.role === 'assistant')
    ) {
      role = payload.role
      id = typeof payload.id === 'string' ? payload.id : null
      parts = contentParts(payload.content, agent)
    } else if (
      payload.type === 'function_call' ||
      payload.type === 'custom_tool_call'
    ) {
      parts = [tool(payload.name)]
    } else if (payload.type === 'local_shell_call') {
      parts = [tool('Shell')]
    } else if (payload.type === 'web_search_call') {
      parts = [tool('Web search')]
    } else if (payload.type === 'image_generation_call') {
      parts = [tool('Image generation')]
    } else return null
  }
  return {
    role,
    id,
    hasText: parts.some((part) => part.type === 'text'),
    parts,
    occurredAt: timestamp(row.timestamp),
  }
}
