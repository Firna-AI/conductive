import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { people, type PersonKey } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import headingStyles from '../../../../../src/ui/components/common/MarkdownHeadings.module.css'
import prose from '../../../../../src/ui/components/common/MarkdownProse.module.css'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useMessageMarks, type MessageMarks } from '../explain/chatMarks'
import { markedDrawing } from '../explain/markedDrawing'
import { MarkedText } from '../explain/MarkedText'
import { WholeMark } from '../explain/WholeMark'
import { AgentBlocks } from '../../../../../src/ui/components/chat/AgentBlocks'
import { agentBlocks } from '../../entries/components/chat/AgentBlocks.mockup'
import type { SingleItem } from './groupItems'
import { ChangeNoteView } from './ChangeNoteView'
import { linkedLine } from '../../entries/components/chat/LinkedLine.mockup'
import { lostLine } from '../../entries/components/chat/LostLine.mockup'
import {
  turnFilesUnavailable,
  unlistedFiles,
} from '../../../../../src/ui/components/chat/lostCopy'
import { macCommand } from '../../entries/components/chat/MacCommand.mockup'
import { filesWithoutPlace, MessageText, useSentParts } from './MessageText'
import {
  linkText,
  messageText,
} from '../../entries/components/chat/MessageText.mockup'
import { LateAnswerLine } from './LateAnswerLine'
import { isLateRequest } from './requests'
import { SecretRequest } from './SecretRequest'
import { SecretRun } from './SecretRun'
import { sentFiles } from '../../entries/components/chat/SentFiles.mockup'
import { standardSpeedText } from '../../../../../src/ui/components/chat/speedCopy'
import type { StopSource } from '../../../../../src/ui/components/chat/StopLine'
import { stopLine } from '../../entries/components/chat/StopLine.mockup'
import {
  memberStopped,
  stoppedUnnamed,
} from '../../../../../src/ui/components/chat/stopCopy'
import { WakeLine } from '../../../../../src/ui/components/chat/WakeLine'
import { turnEnd } from '../../entries/components/chat/TurnEnd.mockup'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/chat/ChatItemView.module.css'

type StoppedItem = Extract<SingleItem, { kind: 'stopped' }>

type UserItem = Extract<SingleItem, { kind: 'user' }>

/** A run of the text of a member message, with the chips that it holds. */
function SentText(props: { item: UserItem; text: string }) {
  const files = props.item.attachments ?? []
  const parts = useSentParts(props.text, files)
  return <MessageText files={files} parts={parts} waits={props.item.queued} />
}

/**
 * A message of a member: its text, as `chatParts` of the app reads it,
 * with each chip at its place, and under it the files that its text does
 * not show. While the message waits for the cloud computer, the chip of an
 * attached file opens nothing. The text shows the marks of its
 * explanations and the selection of the member, as `MarkedText` draws them.
 */
function UserBubble(props: { item: UserItem; marks?: MessageMarks }) {
  const { item, marks } = props
  const files = item.attachments ?? []
  const parts = useSentParts(item.text, files)
  const listed = filesWithoutPlace(parts, files)
  return (
    <div className={styles.user}>
      <div className={styles.bubble}>
        {marks ? (
          <MarkedText
            marks={marks}
            render={(part) => <SentText item={item} text={part} />}
            text={item.text}
          />
        ) : (
          <messageText.Component
            files={files}
            mentions
            moklyInstance="text"
            text={item.text}
            {...defined({ waits: item.queued, pointer: item.pointer })}
          />
        )}
      </div>
      {listed.length > 0 ? (
        <sentFiles.Component files={listed} moklyInstance="sent-files" />
      ) : null}
    </div>
  )
}

/**
 * Who stopped a turn. A stop from a session names that session with its
 * chip. Else the line names the member who pressed Stop, and says "You" to
 * that member. A turn that stopped with no Stop, such as when the cloud
 * computer stopped, names no member.
 */
function stopSource(item: StoppedItem, viewer: PersonKey): StopSource {
  if (item.from !== undefined) {
    return {
      kind: 'session',
      chip: (
        <linkText.Component href={item.from} moklyInstance="stop-session" />
      ),
    }
  }
  if (item.by === undefined) return { kind: 'words', text: stoppedUnnamed }
  const who = item.by === viewer ? 'You' : people[item.by].name
  return { kind: 'words', text: memberStopped(who) }
}

/**
 * The notes after who stopped a turn: the speed of a fast turn that ran at
 * standard speed, as a finished turn shows it before its files, then the
 * files that the line does not list.
 */
function stopNotes(item: StoppedItem): string[] {
  return [
    ...(item.standardSpeed ? [standardSpeedText(item.standardSpeed)] : []),
    ...(item.omittedFiles ? [unlistedFiles(item.omittedFiles)] : []),
    ...(item.filesUnavailable ? [turnFilesUnavailable] : []),
  ]
}

/**
 * One item of a chat transcript, other than a tool call, which joins a run
 * of tool calls. `viewer` is the person signed in, who reads the transcript.
 * A member message and an answer show the marks of their explanations
 * and the selection of the member, as `MarkedText` draws them.
 */
export function ChatItemView(props: { item: SingleItem; viewer: PersonKey }) {
  const { item, viewer } = props
  const theme = useSharedUiTheme()
  const marks = useMessageMarks(item.id)
  switch (item.kind) {
    case 'user':
      return <UserBubble item={item} marks={marks} />
    case 'agent':
      return (
        <WholeMark mark={marks?.whole}>
          <div
            className={classes(
              styles.agent,
              headingStyles.headings,
              prose.prose,
            )}
          >
            {marks ? (
              <AgentBlocks
                blocks={item.blocks}
                drawing={markedDrawing(marks)}
              />
            ) : (
              <agentBlocks.Component
                blocks={item.blocks}
                id={item.id}
                moklyInstance="blocks"
              />
            )}
          </div>
        </WholeMark>
      )
    case 'mac-command':
      return (
        <macCommand.Component
          id={item.id}
          moklyInstance="command"
          request={item.request}
          state={item.state}
        />
      )
    case 'late-answer':
      return (
        <LateAnswerLine
          grant={item.grant}
          names={item.names}
          org={orgs.acme.name}
          who={item.grant.by === viewer ? 'You' : people[item.grant.by].name}
        />
      )
    case 'wake':
      return (
        <WakeLine
          end={item.end}
          reason={item.reason}
          session={
            <linkText.Component
              href={item.session}
              moklyInstance="wake-session"
            />
          }
        />
      )
    case 'secret-run':
      return isLateRequest(item) ? (
        <SecretRequest item={item} viewer={viewer} />
      ) : (
        <SecretRun item={item} viewer={viewer} />
      )
    case 'turn-end':
      return (
        <turnEnd.Component
          duration={item.duration}
          files={item.files}
          moklyInstance="turn-end"
          {...defined({
            endReason: item.endReason,
            filesUnavailable: item.filesUnavailable,
            omittedFiles: item.omittedFiles,
            standardSpeed: item.standardSpeed,
          })}
        />
      )
    case 'lost':
      return (
        <lostLine.Component
          moklyInstance="lost-line"
          reason={item.reason}
          what={item.what}
        />
      )
    case 'linked':
      // The mockups draw one linked session. Its link leads to the view of
      // its first session that the member sees without the starter's login.
      return (
        <linkedLine.Component
          link={<ScreenLink to={paths.noStarterLogin}>{item.from}</ScreenLink>}
          moklyInstance="linked-line"
        />
      )
    case 'continued':
    case 'repository-changed':
    case 'capabilities-changed':
      return <ChangeNoteView item={item} viewer={viewer} />
    case 'stopped': {
      const source = stopSource(item, viewer)
      return source.kind === 'words' ? (
        <stopLine.Component
          moklyInstance="stop-line"
          notes={stopNotes(item)}
          source={source}
        />
      ) : (
        <stopLine.Component
          chip={source.chip}
          moklyInstance="stop-line"
          notes={stopNotes(item)}
          source={{ kind: 'session' }}
        />
      )
    }
    case 'error':
      return (
        <notice.Component
          {...defined({
            action: item.older ? undefined : (
              <actionButton.Component moklyInstance={`retry-${item.id}`}>
                Try again
              </actionButton.Component>
            ),
          })}
          body={item.text}
          icon="circle-alert"
          moklyInstance={`error-${item.id}`}
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
