import { useEffect, useState } from 'react'
import { ChevronDown, FolderGit2, Sparkles } from 'lucide-react'
import chat from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/screens/NewWorkspaceScreen.module.css'
import { currentBuild } from '../../app/org-model'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import { whenOf, type When } from '../../app/time'
import type { OrgSummary } from '../../shared/orgs'
import type { Repository } from '../../shared/org-settings'
import { useApp, useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { MenuButton } from '../ui/Menu'
import { useViewport } from '../ui/viewport'
import { Composer } from './Composer'
import { CreateFailed, useBlockingNotice } from './notices'

/** "built 8 hours ago", "built yesterday", or "built on 3 Nov". */
function builtWhen(when: When): string {
  return when.kind === 'date' ? `on ${when.text}` : when.text
}

/** The start of the empty chat, with the repository of the new workspace. */
function Start(props: {
  org: OrgSummary
  repositories: readonly Repository[]
  repositoryId: string | undefined
  choose: (id: string) => void
}) {
  const { org } = props
  const app = useApp()
  const go = useGo()
  const builds = valueOf(useStore(useOrgModel(org.id).builds))
  const build = builds ? currentBuild(builds) : undefined
  const chosen = props.repositories.find(
    (item) => item.id === props.repositoryId,
  )
  const { now, timeZone } = app.services
  const builtAt = build ? (build.completedAt ?? build.startedAt) : null
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      <p className={styles.body}>
        {chosen
          ? 'Your first message creates it, on a new branch of the repository.'
          : `Choose the repositories of ${org.name} first.`}
      </p>
      {chosen ? (
        <MenuButton
          entries={props.repositories.map((item) => ({
            kind: 'item',
            label: item.fullName,
            checked: item.id === chosen.id,
            onSelect: () => props.choose(item.id),
          }))}
          label="Repository"
          placement="below-start"
          trigger={({ open, toggle }) => (
            <ActionButton
              accessibilityLabel={`Repository: ${chosen.fullName}`}
              expanded={open}
              icon={FolderGit2}
              menu
              onPress={toggle}
              trailing={
                <ChevronDown aria-hidden className={styles.chevron} size={13} />
              }
            >
              {chosen.fullName}
            </ActionButton>
          )}
        />
      ) : org.role === 'admin' ? (
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
 * app names it and its branch. A failed create keeps the message.
 */
export function NewWorkspaceScreen(props: {
  org: OrgSummary
  sectionId: string | null
}) {
  const { org } = props
  const app = useApp()
  const go = useGo()
  const orgModel = useOrgModel(org.id)
  const [model] = useState(() => orgModel.newWorkspace(props.sectionId))
  const account = useStore(app.account.account)
  const models = useStore(app.models)
  const repositories = valueOf(useStore(orgModel.repositories))
  const sections = valueOf(useStore(orgModel.sections))
  const draft = useStore(model.draft)
  const create = useStore(model.create)
  const phone = useViewport() === 'phone'
  useEffect(() => {
    orgModel.ensure('repositories')
    orgModel.ensure('builds')
    orgModel.ensure('boatKey')
    orgModel.ensure('list')
  }, [orgModel])
  const chosen = (repositories ?? []).filter((item) => item.selected)
  const repositoryId = draft.repositoryId ?? chosen[0]?.id
  const choice = draft.choice ?? account?.defaultChoice
  const notice = useBlockingNotice(org, choice, models)
  const send = async () => {
    if (!repositoryId || !choice) return
    const created = await model.send({ repositoryId, choice })
    if (created) go(routes.workspace(org.id, created.workspace.id))
  }
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
          <Start
            choose={(id) => model.setRepository(id)}
            org={org}
            repositories={chosen}
            repositoryId={repositoryId}
          />
        </div>
        <div className={chat.footer}>
          {create.state === 'failed' ? (
            <CreateFailed error={create.error} retry={() => void send()} />
          ) : null}
          {notice}
          <Composer
            blocked={notice !== null || repositoryId === undefined}
            choice={choice}
            model={model}
            models={models}
            send={() => void send()}
          />
        </div>
      </section>
    </Page>
  )
}
