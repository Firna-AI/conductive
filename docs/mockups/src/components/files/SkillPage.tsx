import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ChevronLeft } from 'lucide-react'
import type { Agent } from '../../../../../src/shared/generated/Agent'
import { SkillIcon } from '../../../../../src/ui/components/chat/SkillChip'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { codeView } from '../../entries/components/files/CodeView.mockup'
import { markdownView } from '../../entries/components/files/MarkdownView.mockup'
import {
  plansBody,
  plansSource,
  skillFileName,
} from '../../fixtures/skillFiles'
import { plansSkill } from '../../fixtures/skills'
import { ScreenLink } from '../common/ScreenLink'
import type { BackLink } from '../layout/Page'
import { ViewSwitch } from './FilePage'
import { skillTabCopy } from './skillTabCopy'
import fileStyles from './FilePage.module.css'
import styles from './SkillPage.module.css'

/**
 * What a skill tab shows under its header: the Markdown body in Preview,
 * the whole text in Source, or a notice in place of the text. The notices
 * are the read that runs, a skill that the list no longer holds, a text
 * over the read limit, and software of the cloud computer that cannot read
 * a skill.
 */
export type SkillTabView =
  'preview' | 'source' | 'loading' | 'gone' | 'too-large' | 'older-software'

/** A spinner and one line, while the read of the text runs. */
function Loading() {
  const theme = useSharedUiTheme()
  return (
    // A div, because the spinner is a block, which a paragraph cannot hold.
    <div className={styles.loading} role="status">
      <Spinner color={theme.colors.muted} size={13} />
      {skillTabCopy.loading}
    </div>
  )
}

/** The text of the skill in a view, or the notice in its place. */
function SkillBody(props: { view: SkillTabView }) {
  switch (props.view) {
    case 'preview':
      return (
        <markdownView.Component blocks={plansBody} moklyInstance="skill-text" />
      )
    case 'source':
      return (
        <codeView.Component
          code={plansSource}
          moklyInstance="skill-source"
          path={skillFileName}
        />
      )
    case 'loading':
      return <Loading />
    case 'gone':
      return (
        <emptyState.Component
          body={skillTabCopy.goneBody}
          icon="file-x"
          moklyInstance="skill-gone"
          title={skillTabCopy.goneTitle}
        />
      )
    case 'too-large':
      return (
        <emptyState.Component
          body={skillTabCopy.tooLargeBody}
          icon="file-warning"
          moklyInstance="skill-too-large"
          title={skillTabCopy.tooLargeTitle}
        />
      )
    case 'older-software':
      return (
        <emptyState.Component
          body={skillTabCopy.olderSoftwareBody}
          icon="rotate-cw"
          moklyInstance="skill-older-software"
          title={skillTabCopy.olderSoftwareTitle}
        />
      )
  }
}

/**
 * The skill `plans` as a full page: a tab of the centre column on desktop,
 * and a page of the Files tab on a phone, as a file is. The header shows
 * the skill icon and the name of the skill in the chip of a file page,
 * then the agent of the skill, such as "Claude skill", because two agents
 * can hold skills with one name. The tab knows its agent, so the agent
 * shows in each view, also with a notice. The description of the skill
 * follows under that line, muted, in at most three lines. A skill that the
 * list no longer holds has no description. The switch between Preview and
 * Source ends the first line. Preview shows the
 * Markdown body without the front matter, with the look of the preview of
 * a Markdown file. Source shows the whole `SKILL.md` with line numbers, and
 * the header gives its line count. The header has no Copy and no Download,
 * because the tab is for reading the skill, and a selection copies text.
 *
 * `placeholder` shows in place of the text, such as the wait of a cloud
 * computer that starts. A notice keeps the header as it is, so it does not
 * move when the text comes.
 */
export function SkillPage(props: {
  view: SkillTabView
  agent: Agent
  back?: BackLink
  placeholder?: ReactNode
}) {
  const { view } = props
  const source = view === 'source'
  const lines = plansSource.split('\n').length
  const description = view === 'gone' ? undefined : plansSkill.description
  return (
    <section aria-label={plansSkill.name} className={fileStyles.page}>
      <div className={styles.header}>
        <div className={styles.line}>
          <div className={fileStyles.start}>
            {props.back ? (
              <ScreenLink className={fileStyles.back} to={props.back.to}>
                <ChevronLeft aria-hidden size={15} />
                <span className={fileStyles.backLabel}>{props.back.label}</span>
              </ScreenLink>
            ) : null}
            <span className={fileStyles.chip}>
              <span className={styles.icon}>
                <SkillIcon size={13} />
              </span>
              <span className={fileStyles.name}>{plansSkill.name}</span>
            </span>
            <span className={styles.agent}>
              {skillTabCopy.agent[props.agent]}
            </span>
          </div>
          <div className={fileStyles.end}>
            {source && props.placeholder === undefined ? (
              <span className={fileStyles.meta}>{`${lines} lines`}</span>
            ) : null}
            <ViewSwitch value={source ? 'source' : 'preview'} />
          </div>
        </div>
        {description ? (
          <p className={styles.description} title={description}>
            {description}
          </p>
        ) : null}
      </div>
      <div className={fileStyles.body}>
        {props.placeholder ?? <SkillBody view={view} />}
      </div>
    </section>
  )
}
