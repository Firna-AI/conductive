import { useCallback, useMemo } from 'react'
import type { Session } from '../../shared/generated/Session'
import type { AnswerSecretRequest } from '../../shared/secret-requests'
import type { ChatReaders } from '../../shared/transcript/turn-words'
import { sessionCommands } from '../device/session-commands'
import { sessionSecrets } from '../secrets/session-secrets'
import type { ChatSnapshot, SessionState } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { sourceInsert } from './SourceLine'

/**
 * The parts of the chat of the session `id` that come from the snapshot:
 * the Mac commands and the secret requests, with the ones that wait above
 * the composer, and the inputs of the transcript: its inserts, its readers,
 * and Try again. Each stays the same value while its data stays the same,
 * so a tick of the clock draws no row of the transcript again. The line of
 * a linked session to its source also stays while the session records stay.
 * A press on that line calls `onOpenSession`, when the chat gives it. Else
 * it shows the named session in its tab, and reopens it first when it is
 * closed.
 */
export function useTranscriptInputs(
  snapshot: ChatSnapshot,
  controller: ChatController,
  id: string | null,
  session: Session | null,
  state: SessionState,
  readOnly: boolean,
  onOpenSession?: (sessionId: string) => void,
) {
  const commands = useMemo(
    () => sessionCommands(snapshot, id, state),
    [snapshot, id, state],
  )
  // A stable answer keeps the props of each secret card while it shows.
  const onAnswer = useCallback(
    (requestId: string, answer: AnswerSecretRequest) =>
      void controller.answerSecret(requestId, answer),
    [controller],
  )
  const secrets = useMemo(
    () => sessionSecrets(snapshot, id, state, { choices: !readOnly, onAnswer }),
    [snapshot, id, state, readOnly, onAnswer],
  )
  const { sessions, history } = snapshot
  const source = useMemo(
    () =>
      sourceInsert(
        { sessions, history },
        session,
        onOpenSession ??
          ((sessionId) => {
            const open = sessions.some((item) => item.id === sessionId)
            void (open
              ? controller.select(sessionId)
              : controller.reopen(sessionId))
          }),
      ),
    [sessions, history, session, controller, onOpenSession],
  )
  const inserts = useMemo(
    () => [
      ...(source ? [source] : []),
      ...commands.inserts,
      ...secrets.inserts,
    ],
    [source, commands, secrets],
  )
  const viewerId = snapshot.account?.user.id ?? null
  const readers: ChatReaders = useMemo(
    () => ({ viewerId, members: snapshot.members }),
    [viewerId, snapshot.members],
  )
  const onRetry = useCallback(
    (messageId: string) => {
      if (id) void controller.retry(id, messageId)
    },
    [controller, id],
  )
  return { commands, secrets, inserts, readers, onRetry }
}
