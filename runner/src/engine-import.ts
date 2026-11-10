import { disposeProvider } from './engine-disposal'
import type { EngineOptions, SessionRuntime } from './engine-session'
import type { ProviderEvent } from './providers/types'

/** Definite native rejection permits one fresh preparation before any agent output. */
export async function fallbackImportedHistory(
  options: EngineOptions,
  session: SessionRuntime,
  event: ProviderEvent,
  restart: () => Promise<void>,
) {
  const turn = session.active
  const saved = options.store.snapshot.sessions.find(
    (saved) => saved.sessionId === session.id,
  )
  if (
    event.type !== 'failed' ||
    event.code !== 'native_history_unavailable' ||
    !turn ||
    turn.stopped ||
    turn.providerOutputStarted ||
    saved?.conductorImport?.preparation !== 'prepared'
  )
    return false
  session.generation++
  await disposeProvider(turn)
  turn.controller.signal.throwIfAborted()
  session.conversationId = null
  await options.store.remember({
    ...saved,
    providerSessionId: null,
    conductorImport: { ...saved.conductorImport, preparation: 'fallback' },
    importFallbackTurnId: turn.first.turnId,
  })
  await options.emitImport?.({
    type: 'import.preparation',
    sessionId: session.id,
    turnId: turn.first.turnId,
    documentId: saved.conductorImport.documentId,
    preparation: 'fallback',
  })
  await restart()
  return true
}
