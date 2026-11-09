import { CircleAlert, FolderGit2 } from 'lucide-react'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'

/**
 * A create that failed, over the composer of the New workspace page or in
 * the New workspace dialog. The message stays, and Try again sends it again.
 */
export function CreateFailedNotice() {
  return (
    <Notice
      action={<ActionButton tone="primary">Try again</ActionButton>}
      body="The app can't reach the server. Your message is kept."
      icon={CircleAlert}
      title="The workspace wasn't created"
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
      <ActionButton icon={FolderGit2}>Choose repositories</ActionButton>
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
    <Notice
      action={props.admin ? <ChooseRepositoriesButton /> : undefined}
      icon={FolderGit2}
      title={
        props.admin
          ? chooseRepositoriesFirst(props.org)
          : adminChoosesRepositories(props.org)
      }
    />
  )
}
