import { chatKey } from './storage-keys'

export const SESSION_INDEX_THROUGH = chatKey('history-session-index', 'through')
export const historySessionPrefix = (sessionId: string) =>
  `${chatKey('history-session', sessionId)}:`
export const historySessionKey = (sessionId: string, eventNumber: number) =>
  `${historySessionPrefix(sessionId)}${String(eventNumber).padStart(20, '0')}`
export const capabilityHistoryPrefix = (sessionId: string) =>
  `${chatKey('history-capability-note', sessionId)}:`
export const capabilityHistoryKey = (sessionId: string, eventNumber: number) =>
  `${capabilityHistoryPrefix(sessionId)}${String(eventNumber).padStart(20, '0')}`
