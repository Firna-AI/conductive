import { useEffect, useState } from 'react'
import { FolderGit2, Sparkles } from 'lucide-react'
import chat from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/screens/NewWorkspaceScreen.module.css'
import { currentBuild } from '../../app/org-model'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import { whenOf, type When } from '../../app/time'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { useViewport } from '../ui/viewport'
import { orgRefusal, RefusedBar } from '../workspace/SandboxNotice'
import { Composer } from './Composer'
import { useShownForm } from './NewWorkspaceHost'
import { repositoriesFirst } from './notices'
import { RepositoryMenu } from './parts'
import {
  useNewWorkspaceForm,
  type NewWorkspaceForm,
} from './useNewWorkspaceForm'

/** "built 8 hours ago", "built yesterday", or "built on 3 Nov". */
function builtWhen(when: When): string {
  return when.kind === 'date' ? `on ${when.text}` : when.text
}

/**
 * The start of the empty chat, with the repository of the new workspace. An
 * org without chosen repositories asks for them first: an admin gets Choose
 * repositories, and a member reads that an admin chooses them. It asks only
 * after the repositories load, as the dialog does.
 */
function Start(props: {
  org: OrgSummary
  form: NewWorkspaceForm
  choose: (id: string) => void
}) {
  const { org, form } = props
  const app = useApp()
  const go = useGo()
  const builds = valueOf(useStore(useOrgModel(org.id).builds))
  const build = builds ? currentBuild(builds) : undefined
  const chosen = form.repository
  const unchosen = form.repositories?.length === 0
  const { now, timeZone } = app.services
  const builtAt = build ? (build.completedAt ?? build.startedAt) : null
  const body = chosen
    ? 'Your first message creates it, on a new branch of the repository.'
    : unchosen
      ? `${repositoriesFirst(org)}.`
      : null
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      {body === null ? null : <p className={styles.body}>{body}</p>}
      {chosen ? (
        <RepositoryMenu
          chevron={styles.chevron}
          choose={props.choose}
          chosen={chosen}
          repositories={form.repositories ?? []}
        />
      ) : unchosen && org.role === 'admin' ? (
        <ActionButton
          icon={FolderGit2}
          onPress={() => go(routes.settings(org.id, 'repositories'))}
        >
          Choose repositories
        </ActionButton>
      ) : null}
      {chosen && builtAt !== null ? (
        <p className={styles.note}>
          Starts from the cloud computer of {org.name}, built{' '}
          {builtWhen(whenOf(now(), builtAt, timeZone))}.
        </p>
      ) : null}
    </div>
  )
}

/**
 * New workspace: an empty chat with the repository, and the composer with
 * its files and its model. The first message creates the workspace, and the
 * app names it and its branch. A create request that fails keeps the
 * message in the form of the section, which the dialog shares, with Try
 * again. Once the server takes the message, the workspace exists, also
 * when its first start fails. A suspended org refuses each create, so its
 * page shows the refused bar in place of the composer, and the empty chat
 * invites no first message.
 */
export function NewWorkspaceScreen(props: {
  org: OrgSummary
  sectionId: string | null
}) {
  const { org } = props
  const go = useGo()
  const orgModel = useOrgModel(org.id)
  const [model] = useState(() => orgModel.newWorkspace(props.sectionId))
  const form = useNewWorkspaceForm(org, model, go)
  const sections = valueOf(useStore(orgModel.sections))
  const phone = useViewport() === 'phone'
  const { suspended } = useOrgAccess(org)
  useEffect(() => orgModel.watch('builds'), [orgModel])
  useShownForm()
  const section = sections?.find((item) => item.id === props.sectionId)
  return (
    <Page
      back={{ label: 'Workspaces', to: routes.org(org.id) }}
      fill
      subtitle={section ? `${org.name} · ${section.name}` : org.name}
      title="New workspace"
    >
      <section
        aria-label="Chat"
        className={classes(chat.chat, phone && chat.mobile)}
      >
        <div className={chat.empty}>
          {suspended ? null : (
            <Start
              choose={(id) => model.setRepository(id)}
              form={form}
              org={org}
            />
          )}
        </div>
        <div className={chat.footer}>
          {suspended ? (
            <RefusedBar reason={orgRefusal.reason} />
          ) : (
            <>
              {form.failure}
              {form.notice}
              <Composer
                choice={form.choice}
                model={model}
                models={form.models}
                ready={form.ready}
                send={form.send}
              />
            </>
          )}
        </div>
      </section>
    </Page>
  )
}
