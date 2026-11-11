import { useSyncExternalStore } from 'react'
import { sessionState, type ChatSnapshot } from '../../chat/state/chat-snapshot'
import type { ChatController } from '../../chat/state/controller'
import type { BarActions } from '../barActions'
import styles from './DevPage.module.css'

/** The text of the last message of the member in the session of the chat. */
function lastSent(snapshot: ChatSnapshot): string | null {
  const id = snapshot.activeSessionId
  if (id === null) return null
  const state = sessionState(snapshot, id)
  const users = state.transcript.items.flatMap((item) =>
    item.kind === 'user' ? [item.message.text] : [],
  )
  return state.pending.at(-1)?.text ?? users.at(-1) ?? null
}

/**
 * What the real chat and the real action state of the page hold: the last
 * message in the session of the chat, such as the prompt of an action, and
 * the question of Continue, which the workspace screen asks in a dialog.
 */
export function DevReadout(props: {
  actions: BarActions
  chat: ChatController
}) {
  const { actions, chat } = props
  const { question } = useSyncExternalStore(
    actions.subscribe,
    actions.getSnapshot,
  )
  const sent = useSyncExternalStore(chat.subscribe, () =>
    lastSent(chat.getSnapshot()),
  )
  return (
    <section aria-label="The chat and the question" className={styles.readout}>
      <p className={styles.frameLabel}>The chat and the question</p>
      <p>{sent ?? 'No message yet'}</p>
      {question ? (
        <p>
          {`Continue asks first: ${question.localWork.uncommittedFiles.length} changed files and ${question.localWork.unpushedCommits} commits are not on GitHub.`}{' '}
          <button onClick={() => actions.cancelContinue()} type="button">
            Cancel
          </button>{' '}
          <button onClick={() => actions.confirmContinue()} type="button">
            Continue anyway
          </button>
        </p>
      ) : null}
    </section>
  )
}
