import type { ReactNode } from 'react'
import {
  ChevronLeft,
  CircleAlert,
  FileWarning,
  FileX,
  RotateCw,
} from 'lucide-react'
import { SkillIcon } from '../../ui/components/chat/SkillChip'
import { skillTabCopy } from '../../ui/components/files/skillTabCopy'
import skillStyles from '../../ui/components/files/SkillPage.module.css'
import type { SkillIdentity } from '../../shared/skills'
import { CodeView } from '../code/CodeView'
import { MarkdownView, type PreviewStates } from '../markdown/MarkdownView'
import { splitLines } from '../model/file-text'
import type { Loaded } from '../model/resource-loader'
import type { FileMode, FilesLayout, FilesNavigation } from '../navigation'
import { ActionButton } from '../ui/actions'
import { EmptyState, Loading } from '../ui/EmptyState'
import { FilesLink } from '../ui/FilesLink'
import { LayoutRoot } from '../ui/layout'
import { lineCount } from './FilePage'
import { skillBody, skillViewText } from './skill-body'
import { ViewSwitch } from './ViewSwitch'
import styles from './FilePage.module.css'

/** The file name of the text of a skill, by which Source colours it. */
const SKILL_FILE = 'SKILL.md'

/**
 * The codes of a read that waits for the cloud computer: the workspace
 * shows the state of its sandbox once the stream brings it.
 */
const waitCodes: readonly (string | null)[] = [
  'computer_stopped',
  'computer_starting',
]

/** The spinner and the line of a read of the text, or of its parse. */
function SkillLoading() {
  return <Loading label={skillTabCopy.loading} />
}

/** A read or a parse that failed, with Try again, as for a file tab. */
function SkillFailed(props: { onRetry: () => void }) {
  return (
    <EmptyState
      action={
        <ActionButton onPress={props.onRetry}>
          {skillTabCopy.tryAgain}
        </ActionButton>
      }
      alert
      icon={CircleAlert}
      title={skillTabCopy.failedTitle}
    />
  )
}

/** The words of the parse of the Markdown body in Preview. */
const previewStates: PreviewStates = {
  loading: <SkillLoading />,
  failed: (onRetry) => <SkillFailed onRetry={onRetry} />,
}

/**
 * What takes the place of the text while it does not show: the spinner of
 * the read, a notice, or the failure with Try again.
 */
function SkillNotice(props: {
  read: Exclude<Loaded<string>, { status: 'ready' }> | null
  onRetry: () => void
}) {
  const { read } = props
  if (read?.status !== 'failed') return <SkillLoading />
  const { error } = read
  switch (error.kind) {
    case 'not-found':
      return (
        <EmptyState
          body={skillTabCopy.goneBody}
          icon={FileX}
          title={skillTabCopy.goneTitle}
        />
      )
    case 'too-large':
      return (
        <EmptyState
          body={skillTabCopy.tooLargeBody}
          icon={FileWarning}
          title={skillTabCopy.tooLargeTitle}
        />
      )
    case 'aborted':
      return <SkillLoading />
    case 'failed':
      if (error.code === 'skill_reads_unsupported') {
        return (
          <EmptyState
            body={skillTabCopy.olderSoftwareBody}
            icon={RotateCw}
            title={skillTabCopy.olderSoftwareTitle}
          />
        )
      }
      if (waitCodes.includes(error.code)) return <SkillLoading />
      return <SkillFailed onRetry={props.onRetry} />
  }
}

/**
 * One skill as a page: a tab of the centre column on desktop, and a page
 * of the Files tab on a phone, with a way back to All files, as a file is.
 * The header has the look of the header of a file page: the skill icon
 * and the name in the quiet chip, then the agent of the skill, such as
 * "Claude skill", and the switch between Preview and Source at its end.
 * The description from the skills list follows, muted, in at most three
 * lines, and its title gives the whole text. The header has no Copy and no
 * Download.
 *
 * Preview shows the Markdown body without the front matter, with the
 * Markdown preview of a file, and Source shows the whole text with line
 * numbers and its line count. A notice takes the place of the text while
 * the read runs, for a skill that the lists no longer hold, a text over the
 * limit, older cloud computer software, and a read that failed, with Try
 * again. `placeholder` takes the place of the text, such as the state of a
 * cloud computer that does not run. Each notice keeps the header.
 */
export function SkillPage(props: {
  skill: SkillIdentity
  /** The description from the skills list, or null when it gives none. */
  description: string | null
  read: Loaded<string> | null
  onRetry: () => void
  mode: FileMode
  onMode: (mode: FileMode) => void
  layout: FilesLayout
  /** The navigation of the Files screens, for the way back on a phone. */
  navigation: FilesNavigation
  placeholder?: ReactNode
}) {
  const { skill, read, placeholder } = props
  const text = read?.status === 'ready' ? skillViewText(read.value) : null
  const source = props.mode === 'source'
  let body: ReactNode = placeholder
  if (body === undefined) {
    body =
      read?.status !== 'ready' ? (
        <SkillNotice onRetry={props.onRetry} read={read} />
      ) : source ? (
        <CodeView name={SKILL_FILE} text={text ?? ''} />
      ) : (
        <MarkdownView states={previewStates} text={skillBody(text ?? '')} />
      )
  }
  const lines =
    source && text !== null && placeholder === undefined
      ? lineCount(splitLines(text).length)
      : null
  return (
    <LayoutRoot
      className={styles.page}
      label={skill.name}
      layout={props.layout}
    >
      <div className={skillStyles.header}>
        <div className={skillStyles.line}>
          <div className={styles.start}>
            {props.layout === 'phone' ? (
              <FilesLink
                aria-label="Back to All files"
                className={styles.back}
                navigation={props.navigation}
                to={{ kind: 'list', list: 'all' }}
              >
                <ChevronLeft aria-hidden size={15} />
                <span className={styles.backLabel}>All files</span>
              </FilesLink>
            ) : null}
            <span className={styles.chip} title={skill.name}>
              <span className={skillStyles.icon}>
                <SkillIcon size={13} />
              </span>
              <span className={styles.name}>{skill.name}</span>
            </span>
            <span className={skillStyles.agent}>
              {skillTabCopy.agent[skill.agent]}
            </span>
          </div>
          <div className={styles.end}>
            {lines ? <span className={styles.meta}>{lines}</span> : null}
            <ViewSwitch mode={props.mode} onChange={props.onMode} />
          </div>
        </div>
        {props.description ? (
          <p className={skillStyles.description} title={props.description}>
            {props.description}
          </p>
        ) : null}
      </div>
      <div className={styles.body}>{body}</div>
    </LayoutRoot>
  )
}
