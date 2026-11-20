import { useId, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Search } from 'lucide-react'
import {
  noSecretMatch,
  noSecrets,
  secretsPartWords,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import styles from '../../../docs/mockups/src/components/capabilities/Capabilities.module.css'
import {
  matchingSecrets,
  needsSecretSearch,
} from '../../../docs/mockups/src/components/capabilities/secretSearch'
import check from '../../../docs/mockups/src/components/common/CheckOption.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { routes } from '../../app/router'
import type { OrgSecret } from '../../shared/secrets'
import { AppLink } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'
import type { SecretsView } from './capability-parts'

/**
 * A secret of the org with its checkbox, which pre-approves it for the
 * workspace. A secret for all agents is always available, so its checkbox
 * stays checked and off, with the words "All agents".
 */
function SecretCheck(props: {
  secret: OrgSecret
  checked: boolean
  disabled: boolean
  change: (on: boolean) => void
}) {
  const { secret } = props
  const hint = useId()
  const tag = useId()
  return (
    <label className={check.option}>
      <input
        aria-describedby={secret.allAgents ? `${hint} ${tag}` : hint}
        aria-label={secret.name}
        checked={props.checked || secret.allAgents}
        className={check.box}
        disabled={secret.allAgents || props.disabled}
        onChange={(event) => props.change(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className={check.text}>
        <span className={styles.secretName}>{secret.name}</span>
        <span className={check.hint} id={hint}>
          {secret.description}
        </span>
      </span>
      {secret.allAgents ? (
        <span className={styles.tag} id={tag}>
          {secretsPartWords.allAgents}
        </span>
      ) : null}
    </label>
  )
}

/** The listed secrets with their checkboxes, or the line of no match. */
function SecretChecks(props: {
  view: SecretsView
  secrets: readonly OrgSecret[]
  search: string
}) {
  const { view } = props
  if (props.secrets.length === 0) {
    return <p className={styles.empty}>{noSecretMatch(props.search)}</p>
  }
  return (
    <div
      aria-label="Pre-approved secrets"
      className={styles.checks}
      role="group"
    >
      {props.secrets.map((secret) => (
        <SecretCheck
          change={(on) => view.setPreapproved(secret.id, on)}
          checked={view.preapproved.includes(secret.id)}
          disabled={view.disabled}
          key={secret.id}
          secret={secret}
        />
      ))}
    </div>
  )
}

/**
 * The secrets with a search field above them, which narrows the list by
 * name and by description. A hidden secret keeps its check.
 */
function SecretSearch(props: {
  view: SecretsView
  secrets: readonly OrgSecret[]
}) {
  const { field } = useControlSizes()
  const [search, setSearch] = useState('')
  return (
    <div className={styles.picker}>
      <InputFrame
        accessibilityLabel={secretsPartWords.search}
        onChangeText={setSearch}
        placeholder={secretsPartWords.search}
        prefixIcon={Search}
        size={field}
        value={search}
      />
      <SecretChecks
        search={search}
        secrets={matchingSecrets(props.secrets, search)}
        view={props.view}
      />
    </div>
  )
}

/**
 * The secrets of the org, each with its checkbox. An org without secrets
 * links to its Secrets tab. More than ten secrets get a search field. A
 * quiet spinner shows while the secrets load, and a failed read shows Try
 * again.
 */
export function SecretPicker(props: { view: SecretsView }) {
  const { view } = props
  const theme = useSharedUiTheme()
  const { secrets } = view
  if (secrets.state === 'loading') {
    return <Spinner color={theme.colors.muted} size={14} />
  }
  if (secrets.state === 'failed') {
    return (
      <LoadFailure
        error={secrets.error}
        retry={view.retry}
        title="The secrets did not load"
      />
    )
  }
  if (secrets.value.length === 0) {
    return (
      <p className={styles.empty}>
        {noSecrets(view.org.name)}{' '}
        <AppLink
          className={styles.link}
          to={routes.settings(view.org.id, 'secrets')}
        >
          {secretsPartWords.add}
        </AppLink>
      </p>
    )
  }
  if (needsSecretSearch(secrets.value.length)) {
    return <SecretSearch secrets={secrets.value} view={view} />
  }
  return <SecretChecks search="" secrets={secrets.value} view={view} />
}
