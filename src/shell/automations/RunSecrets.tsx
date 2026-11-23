import { Fragment, useEffect } from 'react'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { runSecretsWords } from '../../ui/components/capabilities/capabilitiesCopy'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/automations/PromptBox.module.css'
import { useStore, valueOf } from '../../app/store'
import type { Automation } from '../../shared/automations'
import type { OrgSecret } from '../../shared/secrets'
import { useOrgModel } from '../context'

/** A chosen secret as the answer of its automation names it, with no value. */
export type NamedSecret = Pick<OrgSecret, 'id' | 'name'>

function compare(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * The names of the chosen secrets `ids`, for the line under the prompt, in
 * the order of the secrets list of the org: by name, then by ID.
 *
 * `names` holds the chosen secrets that the answer of `saved`, the saved
 * automation, names. Only they name a saved choice, so the page reads no
 * list for it, also when the list fails to load. A saved choice that they
 * leave out, such as of a deleted secret, has no name, also when an older
 * list names it, so the line leaves it out. A secret that the owner checked
 * before Save takes its name from the list of the org that the open
 * control loaded.
 *
 * `names` is null for a new automation, and for the answer of a previous
 * Worker, which names no chosen secret. The list then names each chosen
 * secret, and the page reads the list when an ID has no name in it.
 */
export function useChosenSecretNames(
  orgId: string,
  ids: readonly string[],
  saved: Automation | null,
  names: readonly NamedSecret[] | null,
): string[] {
  const { secrets } = useOrgModel(orgId)
  const list = valueOf(useStore(secrets.list.store)) ?? []
  const savedIds = saved?.capabilities.preapprovedSecretIds ?? []
  const named = (id: string): NamedSecret | undefined => {
    const source: readonly NamedSecret[] =
      names !== null && savedIds.includes(id) ? names : list
    return source.find((secret) => secret.id === id)
  }
  const missing = names === null && ids.some((id) => !named(id))
  useEffect(() => {
    if (missing) void secrets.read()
  }, [secrets, missing])
  return ids
    .flatMap((id) => named(id) ?? [])
    .sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id))
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
