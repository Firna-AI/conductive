import type { ReactNode } from 'react'
import { FolderSearch, Lock, SearchX, type LucideIcon } from 'lucide-react'
import { secretNote } from '../../docs/mockups/src/components/settings/envVarCopy'
import {
  skillCount,
  skillsCopy,
  skillsNoticeText,
  type NoSkillsCause,
} from '../../docs/mockups/src/components/settings/skillsCopy'
import { shownSkills } from '../app/skills-lookup'
import type {
  OrgSettings,
  SkillsRepositoryLookupResponse,
} from '../shared/org-settings'
import type { Resource } from './useResource'
import { InlineText } from './ui/InlineText'
import { Loading, LoadFailure } from './ui/Loading'
import { Notice } from './ui/Notice'
import { MonoBlock, Section, SectionText } from './ui/Section'
import { StatusText } from './ui/StatusText'
import styles from './ComputerSections.module.css'

/**
 * A script of the org as text, without a field or Save, for a member who
 * is not an admin (decision 57). `notice` shows under the script.
 */
export function ScriptSection(props: {
  title: string
  description: string
  script: string
  notice?: ReactNode
}) {
  return (
    <Section description={props.description} title={props.title}>
      {props.script.trim() ? (
        <MonoBlock label={props.title} text={props.script} />
      ) : (
        <SectionText muted>The script is empty.</SectionText>
      )}
      {props.notice}
    </Section>
  )
}

/**
 * The env vars of the org by name and Secret mark, read-only. Values are
 * write-only, so the browser never gets one: each row only shows that its
 * value is set. The mark is a word without a control, because only an
 * admin changes it.
 */
export function EnvVarsSection(props: {
  orgName: string
  envVars: OrgSettings['envVars']
}) {
  return (
    <Section
      description={`Workspaces of ${props.orgName} get these each time their cloud computer starts. Builds run without them.`}
      title="Environment variables"
    >
      {props.envVars.length === 0 ? (
        <SectionText muted>No environment variables yet.</SectionText>
      ) : (
        <>
          <ul aria-label="Environment variables" className={styles.list}>
            {props.envVars.map((item) => (
              <li className={styles.row} key={item.name}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.mark}>
                  {item.secret ? (
                    <StatusText icon={Lock} label="Secret" tone="neutral" />
                  ) : null}
                </span>
                <span
                  aria-label="Value set"
                  className={styles.value}
                  role="img"
                >
                  ••••••••
                </span>
              </li>
            ))}
          </ul>
          <SectionText muted>{secretNote}</SectionText>
        </>
      )}
    </Section>
  )
}

/** The icon of each notice of a saved repository that gives no skills. */
const noSkillsIcons: Readonly<Record<NoSkillsCause, LucideIcon>> = {
  private: Lock,
  'not-found': SearchX,
  'without-skills': FolderSearch,
}

/**
 * The skills that the lookup found: their number, then the name of each
 * skill folder, in the order of the lookup. `incomplete` adds the note of
 * a file tree that GitHub cut short, which shows alone when the cut tree
 * holds no skill.
 */
function SkillList(props: { skills: readonly string[]; incomplete: boolean }) {
  const { skills } = props
  return (
    <div className={styles.skills}>
      {skills.length > 0 ? (
        <>
          <p className={styles.skillCount}>{skillCount(skills.length)}</p>
          <ul aria-label={skillsCopy.list} className={styles.skillList}>
            {skills.map((name) => (
              <li className={styles.skill} key={name}>
                {name}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {props.incomplete ? (
        <SectionText muted>{skillsCopy.incomplete}</SectionText>
      ) : null}
    </div>
  )
}

/**
 * What the lookup of the saved repository gives: a quiet line while it
 * runs, the list of skills, a notice in place of the list, or the notice
 * of data that did not load, with Try again. A failed request shows the
 * message of the API, such as an expired GitHub sign-in. A member reads
 * that an admin can act, and in a suspended org the notice names nobody.
 */
function LookupResult(props: {
  lookup: Resource<SkillsRepositoryLookupResponse>
  onRetry: () => void
  suspended: boolean
}) {
  const { lookup, onRetry } = props
  const title = skillsCopy.failed.title
  if (lookup.status === 'loading') return <Loading label="Loading the skills" />
  if (lookup.status === 'failed') {
    return (
      <LoadFailure message={lookup.message} onRetry={onRetry} title={title} />
    )
  }
  const shown = shownSkills(lookup.value)
  switch (shown.kind) {
    case 'list':
      return <SkillList incomplete={shown.incomplete} skills={shown.skills} />
    case 'failed':
      return (
        <LoadFailure
          message={skillsCopy.failed.body}
          onRetry={onRetry}
          title={title}
        />
      )
    case 'notice': {
      const text = skillsNoticeText({
        cause: shown.cause,
        repository: lookup.value.repository,
        viewer: props.suspended ? 'suspended' : 'member',
      })
      return (
        <Notice
          body={<InlineText text={text.body} />}
          icon={noSkillsIcons[shown.cause]}
          title={text.title}
        />
      )
    }
  }
}

/**
 * The skills repository of the org as text, without a field or Save, for a
 * member who is not an admin (skills decision 2 A), and for everyone in a
 * suspended org. Under it, the skills that the lookup found, or a notice in
 * place of them. Without a saved repository, a member reads that an admin
 * can choose one, and a suspended org says only that none is chosen.
 */
export function SkillsSection(props: {
  /** The saved owner/name, or empty text when the org has none. */
  repository: string
  lookup: Resource<SkillsRepositoryLookupResponse>
  onRetry: () => void
  suspended: boolean
}) {
  const viewer = props.suspended ? 'suspended' : 'member'
  return (
    <Section description={skillsCopy.description} title={skillsCopy.title}>
      {props.repository === '' ? (
        <SectionText muted>{skillsCopy.empty[viewer]}</SectionText>
      ) : (
        <>
          <dl className={styles.details}>
            <div className={styles.detail}>
              <dt className={styles.term}>{skillsCopy.label}</dt>
              <dd className={styles.detailValue}>{props.repository}</dd>
            </div>
          </dl>
          <LookupResult
            lookup={props.lookup}
            onRetry={props.onRetry}
            suspended={props.suspended}
          />
        </>
      )}
    </Section>
  )
}
