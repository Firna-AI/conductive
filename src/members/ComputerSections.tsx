import type { ReactNode } from 'react'
import { MonoBlock, Section, SectionText } from './ui/Section'
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
 * The env vars of the org by name, read-only. Values are write-only, so the
 * browser never gets one: each row only shows that its value is set.
 */
export function EnvVarsSection(props: {
  orgName: string
  envVars: readonly { name: string }[]
}) {
  return (
    <Section
      description={`Workspaces of ${props.orgName} get these each time their cloud computer starts. Builds run without them.`}
      title="Environment variables"
    >
      {props.envVars.length === 0 ? (
        <SectionText muted>No environment variables yet.</SectionText>
      ) : (
        <ul aria-label="Environment variables" className={styles.list}>
          {props.envVars.map((item) => (
            <li className={styles.row} key={item.name}>
              <span className={styles.name}>{item.name}</span>
              <span aria-label="Value set" className={styles.value} role="img">
                ••••••••
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
