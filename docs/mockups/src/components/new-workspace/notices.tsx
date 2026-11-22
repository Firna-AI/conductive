import type { ReactNode } from 'react'
import { defined } from '../../defined'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'

/** The title of a create that failed, or that the server refused. */
const notCreated = "The workspace wasn't created"

/**
 * A create that failed, over the composer of the New workspace page or in
 * the New workspace dialog. The message stays, and Try again sends it again.
 */
export function CreateFailedNotice(props: { ready?: boolean }) {
  return (
    <notice.Component
      action={
        <actionButton.Component
          disabled={props.ready === false}
          moklyInstance="retry-create"
          tone="primary"
        >
          Try again
        </actionButton.Component>
      }
      body="The app can't reach the server. Your message is kept."
      icon="circle-alert"
      moklyInstance="create-failed"
      title={notCreated}
      tone="danger"
    />
  )
}

/**
 * A create that the server refused, in the place of a failed create, such
 * as for a picked branch that is no longer on GitHub (decision 303). `body`
 * names the cause and says that the message stays. `action` is the one
 * recovery of the refusal.
 */
export function CreateRefusedNotice(props: {
  body: string
  action: ReactNode
}) {
  return (
    <notice.Component
      action={props.action}
      body={props.body}
      icon="circle-alert"
      moklyInstance="create-refused"
      title={notCreated}
      tone="danger"
    />
  )
}

/** What an org without chosen repositories asks of an admin first. */
export function chooseRepositoriesFirst(org: string): string {
  return `Choose the repositories of ${org} first`
}

/**
 * What a member who is not an admin reads in an org without chosen
 * repositories, as on the empty page of the org: only an admin chooses them.
 */
function adminChoosesRepositories(org: string): string {
  return `An admin of ${org} chooses its repositories first`
}

/** Opens the Repositories tab of the org settings, for an admin. */
export function ChooseRepositoriesButton() {
  return (
    <ScreenLink asChild to={paths.repositories}>
      <actionButton.Component
        icon="folder-git-2"
        moklyInstance="choose-repositories"
      >
        Choose repositories
      </actionButton.Component>
    </ScreenLink>
  )
}

/**
 * The notice of the New workspace dialog in an org that has chosen no
 * repositories yet, so no workspace can start. An admin gets Choose
 * repositories. A member who is not an admin reads that an admin chooses
 * them. The page says the same words in its empty chat.
 */
export function ChooseRepositoriesNotice(props: {
  org: string
  admin: boolean
}) {
  return (
    <notice.Component
      icon="folder-git-2"
      moklyInstance="choose-repositories-notice"
      {...defined({
        action: props.admin ? <ChooseRepositoriesButton /> : undefined,
      })}
      title={
        props.admin
          ? chooseRepositoriesFirst(props.org)
          : adminChoosesRepositories(props.org)
      }
    />
  )
}
