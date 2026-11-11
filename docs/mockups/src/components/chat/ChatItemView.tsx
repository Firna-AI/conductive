import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert } from 'lucide-react'
import { people, type PersonKey } from '../../fixtures/members'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { AgentBlocks } from './AgentBlocks'
import { AttachmentChips } from './AttachmentChips'
import { ContinuedLine } from './ContinuedLine'
import type { SingleItem } from './groupItems'
import { LinkedLine } from './LinkedLine'
import { LostLine } from './LostLine'
import { turnFilesUnavailable, unlistedFiles } from './lostCopy'
import { MacCommand } from './MacCommand'
import { LinkText, MessageText } from './MessageText'
import { StopLine, type StopSource } from './StopLine'
import { memberStopped, stoppedUnnamed } from './stopCopy'
import { TurnEnd } from './TurnEnd'
import styles from './ChatItemView.module.css'

type StoppedItem = Extract<SingleItem, { kind: 'stopped' }>

/**
 * Who stopped a turn. A stop from a session names that session with its
 * chip. Else the line names the member who pressed Stop, and says "You" to
 * that member. A turn that stopped with no Stop, such as when the cloud
 * computer stopped, names no member.
 */
function stopSource(item: StoppedItem, viewer: PersonKey): StopSource {
  if (item.from !== undefined) {
    return { kind: 'session', chip: <LinkText href={item.from} /> }
  }
  if (item.by === undefined) return { kind: 'words', text: stoppedUnnamed }
  const who = item.by === viewer ? 'You' : people[item.by].name
  return { kind: 'words', text: memberStopped(who) }
}

/** The notes after who stopped a turn: the files that it does not list. */
function stopNotes(item: StoppedItem): string[] {
  return [
    ...(item.omittedFiles ? [unlistedFiles(item.omittedFiles)] : []),
    ...(item.filesUnavailable ? [turnFilesUnavailable] : []),
  ]
}

/**
 * One item of a chat transcript, other than a tool call, which joins a run
 * of tool calls. `viewer` is the person signed in, who reads the transcript.
 */
export function ChatItemView(props: { item: SingleItem; viewer: PersonKey }) {
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
    case 'continued':
      return (
        <ContinuedLine
          base={item.base}
          branch={item.branch}
          who={item.by === viewer ? 'You' : people[item.by].name}
        />
      )
    case 'stopped':
      return (
        <StopLine notes={stopNotes(item)} source={stopSource(item, viewer)} />
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
