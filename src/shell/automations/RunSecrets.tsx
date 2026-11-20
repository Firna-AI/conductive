import { Fragment, useEffect } from 'react'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { runSecretsWords } from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/automations/PromptBox.module.css'
import { useStore, valueOf } from '../../app/store'
import { useOrgModel } from '../context'

/**
 * The names of the chosen secrets, in the order of the secrets of the org,
 * for the line under the prompt. The page reads the secrets of the org
 * when a chosen secret has no name in the list that shows, such as before
 * the first read, or after an owner chose a new secret elsewhere. An ID
 * that the list does not name, such as of a deleted secret, has no name,
 * so the line leaves it out.
 */
export function useChosenSecretNames(
  orgId: string,
  ids: readonly string[],
): string[] {
  const { secrets } = useOrgModel(orgId)
  const list = valueOf(useStore(secrets.list.store)) ?? []
  const missing = ids.some((id) => !list.some((secret) => secret.id === id))
  useEffect(() => {
    if (missing) void secrets.read()
  }, [secrets, missing])
  return list
    .filter((secret) => ids.includes(secret.id))
    .map((secret) => secret.name)
}

/** Names in a sentence, such as "A and B", or "A, B, and C". */
const nameList = new Intl.ListFormat('en', { type: 'conjunction' })

/**
 * The lines under the prompt about the chosen secrets, which every member
 * reads (automation capabilities decision 1 A). The first names the secrets
 * that each run workspace pre-approves, each in the font of an environment
 * variable, such as "Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no
 * question." It hides while no secret has a name. While `pullRequest`, the
 * hint follows it, because text in a pull request reaches the agent of a
 * run (decision 3 A).
 */
export function RunSecrets(props: {
  names: readonly string[]
  pullRequest: boolean
}) {
  if (props.names.length === 0) return null
  return (
    <>
      <p className={styles.caption}>
        <KeyRound aria-hidden className={styles.icon} size={12} />
        <span>
          {runSecretsWords.lead}{' '}
          {nameList.formatToParts(props.names).map((part, index) =>
            part.type === 'element' ? (
              <code className={styles.secret} key={part.value}>
                {part.value}
              </code>
            ) : (
              <Fragment key={index}>{part.value}</Fragment>
            ),
          )}{' '}
          {runSecretsWords.tail}
        </span>
      </p>
      {props.pullRequest ? (
        <p className={styles.caption}>
          <TriangleAlert
            aria-hidden
            className={classes(styles.icon, styles.warning)}
            size={12}
          />
          <span>{runSecretsWords.pullRequest}</span>
        </p>
      ) : null}
    </>
  )
}
