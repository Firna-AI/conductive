import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { secretNote } from '../../docs/mockups/src/components/settings/envVarCopy'
import type { OrgSettings } from '../shared/org-settings'
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
