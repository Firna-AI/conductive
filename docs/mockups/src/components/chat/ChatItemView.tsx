import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { people, type PersonKey } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../common/classes'
import headingStyles from '../common/MarkdownHeadings.module.css'
import prose from '../common/MarkdownProse.module.css'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { agentBlocks } from '../../entries/components/chat/AgentBlocks.mockup'
import { continuedLine } from '../../entries/components/chat/ContinuedLine.mockup'
import { RepositoryChangedLine } from './RepositoryChangedLine'
import type { SingleItem } from './groupItems'
import { linkedLine } from '../../entries/components/chat/LinkedLine.mockup'
import { lostLine } from '../../entries/components/chat/LostLine.mockup'
import { turnFilesUnavailable, unlistedFiles } from './lostCopy'
import { macCommand } from '../../entries/components/chat/MacCommand.mockup'
import { filesWithoutPlace } from './MessageText'
import {
  linkText,
  messageText,
} from '../../entries/components/chat/MessageText.mockup'
import { LateAnswerLine } from './LateAnswerLine'
import { isLateRequest } from './requests'
import { SecretRequest } from './SecretRequest'
import { SecretRun } from './SecretRun'
import { sentFiles } from '../../entries/components/chat/SentFiles.mockup'
import { standardSpeedText } from './speedCopy'
import type { StopSource } from './StopLine'
import { stopLine } from '../../entries/components/chat/StopLine.mockup'
import { memberStopped, stoppedUnnamed } from './stopCopy'
import { turnEnd } from '../../entries/components/chat/TurnEnd.mockup'
import { defined } from '../../defined'
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
 */
export function ChatItemView(props: { item: SingleItem; viewer: PersonKey }) {
  const { item, viewer } = props
  const theme = useSharedUiTheme()
  switch (item.kind) {
    case 'user': {
      const files = item.attachments ?? []
      const listed = filesWithoutPlace(item.text, files)
      return (
        <div className={styles.user}>
          <div className={styles.bubble}>
            <messageText.Component
              files={files}
              mentions
              moklyInstance="text"
              text={item.text}
              {...defined({ waits: item.queued })}
            />
          </div>
          {listed.length > 0 ? (
            <sentFiles.Component files={listed} moklyInstance="sent-files" />
          ) : null}
        </div>
      )
    }
    case 'agent':
      return (
        <div
          className={classes(styles.agent, headingStyles.headings, prose.prose)}
        >
          <agentBlocks.Component
            blocks={item.blocks}
            id={item.id}
            moklyInstance="blocks"
          />
        </div>
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
      return (
        <continuedLine.Component
          base={item.base}
          branch={item.branch}
          moklyInstance="continued-line"
          who={item.by === viewer ? 'You' : people[item.by].name}
        />
      )
    case 'repository-changed':
      return (
        <RepositoryChangedLine
          branch={item.branch}
          repository={item.repository}
          who={item.by === viewer ? 'You' : people[item.by].name}
        />
      )
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
