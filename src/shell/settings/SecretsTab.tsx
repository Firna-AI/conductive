import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  deleteTitle,
  envVarsNote,
  secretsIntro,
  secretsWords,
} from '../../ui/components/secrets/secretsCopy'
import styles from '../../ui/components/secrets/SecretsTab.module.css'
import { Section, SectionText } from '../../ui/components/settings/Section'
import { mayAddSecret, secretRights } from '../../app/permissions'
import { routes } from '../../app/router'
import type { SecretsModel } from '../../app/secrets-model'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { AppLink } from '../ui/AppLink'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'
import { Loaded } from './LoadState'
import { AddSecretForm } from './SecretForms'
import { SecretRow, type RowControls } from './SecretRow'

/**
 * The question before Delete. A deleted secret ends each of its grants, and
 * its value cannot come back, so the dialog asks first. A failed delete
 * keeps the dialog, and a toast names the secret.
 */
function DeleteSecretDialog(props: {
  secret: OrgSecret
  model: SecretsModel
  close: () => void
  deleted: () => void
}) {
  const { secret } = props
  const remove = useAction(async () => {
    await props.model.remove(secret.id)
    props.deleted()
  }, `${secret.name} was not deleted`)
  return (
    <Dialog
      action={
        <ActionButton
          busy={remove.pending}
          icon={Trash2}
          onPress={() => remove.run()}
          tone="danger"
        >
          {secretsWords.delete}
        </ActionButton>
      }
      busy={remove.pending}
      close={props.close}
      title={deleteTitle(secret.name)}
    >
      <DialogText>{secretsWords.deleteBody}</DialogText>
    </Dialog>
  )
}

/** The value that the viewer revealed: at most one at a time. */
interface Shown {
  id: string
  value: string
}

/**
 * The secrets with their rows, the notes, and Add secret. The tab keeps the
 * one revealed value, the open Replace form, and the question before
 * Delete. A new reveal hides the value before it. A Replace hides the value
 * of its secret, and so does its Delete.
 */
function SecretsSection(props: {
  org: OrgSummary
  user: User
  model: SecretsModel
  secrets: readonly OrgSecret[]
}) {
  const { org, user, model, secrets } = props
  const access = useOrgAccess(org)
  const [adding, setAdding] = useState(false)
  const [replacing, setReplacing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<OrgSecret | null>(null)
  const [shown, setShown] = useState<Shown | null>(null)
  const adds = mayAddSecret(access)
  const admin = access.role === 'admin'
  const hideOf = (id: string) =>
    setShown((current) => (current?.id === id ? null : current))
  const controls = (secret: OrgSecret): RowControls => ({
    value: shown?.id === secret.id ? shown.value : null,
    replacing: replacing === secret.id,
    show: (value) =>
      value === null ? hideOf(secret.id) : setShown({ id: secret.id, value }),
    replace: (open) => {
      if (open) hideOf(secret.id)
      setReplacing(open ? secret.id : null)
    },
    remove: () => setDeleting(secret),
  })
  return (
    <>
      <Section
        actions={
          adds && !adding ? (
            <ActionButton icon={Plus} onPress={() => setAdding(true)}>
              {secretsWords.add}
            </ActionButton>
          ) : undefined
        }
        description={secretsIntro}
        title={secretsWords.title}
      >
        {secrets.length === 0 ? (
          <SectionText muted>{secretsWords.none}</SectionText>
        ) : (
          <>
            <ul aria-label={secretsWords.title} className={styles.list}>
              {secrets.map((secret) => (
                <SecretRow
                  controls={controls(secret)}
                  key={secret.id}
                  model={model}
                  rights={secretRights(access, secret, user)}
                  secret={secret}
                  viewer={user}
                />
              ))}
            </ul>
            <SectionText muted>
              {secretsWords.allAgentsNote}
              {!admin && adds ? ` ${secretsWords.memberNote}` : null}
            </SectionText>
          </>
        )}
        <SectionText muted>
          {envVarsNote.before}
          <AppLink
            className={styles.link}
            to={routes.settings(org.id, 'cloud-computer')}
          >
            {envVarsNote.link}
          </AppLink>
          {envVarsNote.after}
        </SectionText>
        {adding && adds ? (
          <AddSecretForm
            close={() => setAdding(false)}
            mark={admin}
            model={model}
            org={org}
          />
        ) : null}
      </Section>
      {deleting ? (
        <DeleteSecretDialog
          close={() => setDeleting(null)}
          deleted={() => {
            hideOf(deleting.id)
            setReplacing((current) =>
              current === deleting.id ? null : current,
            )
            setDeleting(null)
          }}
          model={model}
          secret={deleting}
        />
      ) : null}
    </>
  )
}

/**
 * The Secrets tab of the org settings (secrets decisions 2, 3, and 6): the
 * secrets of the org, with what each is for, who added it, and the record
 * of its last reveal. The list never holds a value. Every member adds
 * secrets, and the rights of each row follow `secretRights`. A suspended
 * org shows the tab with no action. The notes say what the mark for all
 * agents does, and when to use the env vars of the Cloud computer tab
 * instead. The tab reads the secrets each time that it shows.
 */
export function SecretsTab(props: { org: OrgSummary; user: User }) {
  const model = useOrgModel(props.org.id).secrets
  const list = useStore(model.list.store)
  useEffect(() => {
    void model.read()
  }, [model])
  return (
    <Loaded
      failure="The secrets did not load"
      retry={() => model.read()}
      value={list}
    >
      {(secrets) => (
        <SecretsSection
          model={model}
          org={props.org}
          secrets={secrets}
          user={props.user}
        />
      )}
    </Loaded>
  )
}
