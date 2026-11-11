import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, CircleStop } from 'lucide-react'
import type { ChatItem } from '../../fixtures/conversations'
import { people, type PersonKey } from '../../fixtures/members'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { ResumedLine } from '../conductor-import/ResumedLine'
import { AgentBlocks } from './AgentBlocks'
import { AttachmentChips } from './AttachmentChips'
import { LinkedLine } from './LinkedLine'
import { LostLine } from './LostLine'
import { turnFilesUnavailable, unlistedFiles } from './lostCopy'
import { MacCommand } from './MacCommand'
import { MessageText } from './MessageText'
import { ToolGroup } from './ToolGroup'
import { TurnEnd } from './TurnEnd'
import styles from './ChatItemView.module.css'

/**
 * The line of a stopped turn. It names the member who pressed Stop, and
 * says "You" to that member (decision 72). A turn that stopped with no
 * Stop, such as when the cloud computer stopped, names no member.
 */
function stoppedLine(by: PersonKey | undefined, viewer: PersonKey): string {
  if (by === undefined) return 'The agent stopped'
  const who = by === viewer ? 'You' : people[by].name
  return `${who} stopped the agent`
}

/**
 * One item of a chat transcript. `viewer` is the person signed in, who
 * reads the transcript.
 */
export function ChatItemView(props: { item: ChatItem; viewer: PersonKey }) {
  const { item, viewer } = props
  const theme = useSharedUiTheme()
  switch (item.kind) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.bubble}>
            <MessageText mentions text={item.text} />
          </div>
          {item.attachments ? (
            <AttachmentChips attachments={item.attachments} sent />
          ) : null}
        </div>
      )
    case 'agent':
      return (
        <div className={styles.agent}>
          <AgentBlocks blocks={item.blocks} />
        </div>
      )
    case 'tool':
      return <ToolGroup calls={[item]} />
    case 'mac-command':
      return <MacCommand request={item.request} state={item.state} />
    case 'turn-end':
      return (
        <TurnEnd
          duration={item.duration}
          files={item.files}
          filesUnavailable={item.filesUnavailable}
          omittedFiles={item.omittedFiles}
        />
      )
    case 'lost':
      return <LostLine reason={item.reason} what={item.what} />
    case 'linked':
      // The mockups draw one linked session. Its link leads to the view of
      // its first session that the member sees without the starter's login.
      return (
        <LinkedLine
          link={<ScreenLink to={paths.noStarterLogin}>{item.from}</ScreenLink>}
        />
      )
    case 'resumed':
      return (
        <ResumedLine outcome={item.outcome} title={item.title} to={item.to} />
      )
    case 'stopped':
      return (
        <div className={styles.event}>
          <CircleStop size={13} />
          {stoppedLine(item.by, viewer)}
          {item.omittedFiles ? ` · ${unlistedFiles(item.omittedFiles)}` : null}
          {item.filesUnavailable ? ` · ${turnFilesUnavailable}` : null}
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
