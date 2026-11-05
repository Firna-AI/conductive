import { Button } from '@firna/ui/button'
import { Loader } from '@firna/ui/loader'
import { Body, Caption } from '@firna/ui/typography'
import { CircleAlert, CircleStop, Clock } from 'lucide-react'
import type { ChatItem } from '../../fixtures/conversations'
import { noop } from '../../noop'
import { InlineText } from '../common/InlineText'
import { Notice } from '../common/Notice'
import { ToolCall } from './ToolCall'
import styles from './ChatItemView.module.css'

/** One item of a chat transcript. */
export function ChatItemView(props: { item: ChatItem }) {
  const { item } = props
  switch (item.kind) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.bubble}>
            <Body>
              <InlineText text={item.text} />
            </Body>
          </div>
          {item.queued ? (
            <span className={styles.queued}>
              <Clock size={13} />
              <Caption>Sends when the sandbox is ready</Caption>
            </span>
          ) : null}
        </div>
      )
    case 'agent':
      return (
        <div className={styles.agent}>
          {item.paragraphs.map((paragraph) => (
            <Body key={paragraph}>
              <InlineText text={paragraph} />
            </Body>
          ))}
        </div>
      )
    case 'tool':
      return (
        <ToolCall
          detail={item.detail}
          status={item.status}
          target={item.target}
          tool={item.tool}
        />
      )
    case 'stopped':
      return (
        <div className={styles.event}>
          <CircleStop size={14} />
          <Caption>You stopped the agent</Caption>
        </div>
      )
    case 'error':
      return (
        <Notice
          action={
            <Button onPress={noop} size="sm" tone="secondary">
              Try again
            </Button>
          }
          body={item.text}
          icon={CircleAlert}
          title="This turn stopped"
          tone="danger"
        />
      )
    case 'working':
      return (
        <div className={styles.working}>
          <Loader accessibilityLabel="Working" size={18} variant="dots" />
          <Caption>Working · {item.elapsed}</Caption>
        </div>
      )
  }
}
