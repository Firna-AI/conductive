export const CHAT_ROOT = 'chat:v1:'
export const CHAT_META = `${CHAT_ROOT}meta`
export const CHAT_EVENT_PREFIX = `${CHAT_ROOT}event:`

export const chatKey = (kind: string, id: string) =>
  `${CHAT_ROOT}${kind}:${encodeURIComponent(id)}`
export const chatEventKey = (eventNumber: number) =>
  `${CHAT_EVENT_PREFIX}${String(eventNumber).padStart(20, '0')}`
