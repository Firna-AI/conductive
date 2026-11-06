import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, CircleStop, Clock } from 'lucide-react'
import type { ChatItem } from '../../fixtures/conversations'
import { ActionButton } from '../common/actions'
import { InlineText } from '../common/InlineText'
import { Notice } from '../common/Notice'
import { MacCommand } from './MacCommand'
import { ToolGroup } from './ToolGroup'
import { TurnEnd } from './TurnEnd'
import styles from './ChatItemView.module.css'

/** One item of a chat transcript. */
export function ChatItemView(props: { item: ChatItem }) {
  const { item } = props
  const theme = useSharedUiTheme()
  switch (item.kind) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.bubble}>
            <InlineText text={item.text} />
          </div>
          {item.queued ? (
            <span className={styles.queued}>
              <Clock size={12} />
              Sends when the sandbox is ready
            </span>
          ) : null}
        </div>
      )
    case 'agent':
      return (
        <div className={styles.agent}>
          {item.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              <InlineText text={paragraph} />
            </p>
          ))}
          {item.bullets ? (
            <ul>
              {item.bullets.map((bullet) => (
                <li key={bullet}>
                  <InlineText text={bullet} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )
    case 'tool':
      return <ToolGroup calls={[item]} />
    case 'mac-command':
      return <MacCommand request={item.request} state={item.state} />
    case 'turn-end':
      return <TurnEnd duration={item.duration} files={item.files} />
    case 'stopped':
      return (
        <div className={styles.event}>
          <CircleStop size={13} />
          You stopped the agent
        </div>
      )
    case 'error':
      return (
        <Notice
          action={<ActionButton>Try again</ActionButton>}
          body={item.text}
          icon={CircleAlert}
          title="This turn stopped"
          tone="danger"
        />
      )
    case 'working':
      return (
        <div className={styles.working}>
          <Spinner color={theme.colors.primary} size={12} />
          Working
          <span className={styles.elapsed}>{item.elapsed}</span>
        </div>
      )
  }
}
