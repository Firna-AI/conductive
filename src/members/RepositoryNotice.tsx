import { CircleAlert, Hammer } from 'lucide-react'
import { repositoryNoticeText } from '../../docs/mockups/src/components/settings/repositoryChangeCopy'
import { repositoryChangesOf } from '../app/repository-changes'
import type { Org } from '../shared/api'
import type { BuildsResponse } from '../shared/org-settings'
import { Notice } from './ui/Notice'

/**
 * The repository notice of the read-only Repositories and Cloud computer
 * tabs, from the builds of the org, with the words of the mockups. It shows
 * while the org image lacks a chosen repository or still holds a removed
 * one: a spinner while a build runs for an added repository, the danger
 * tone after a failed build, and else the hammer. It has no button, because
 * only an admin builds the computer. A member of an org in use reads that
 * an admin can act. Nobody can act in a suspended org, whose notice says
 * why, so the notice names no admin there.
 */
export function RepositoryNotice(props: {
  builds: BuildsResponse
  org: Org
  suspended?: boolean
}) {
  const changes = repositoryChangesOf(props.builds)
  if (!changes) return null
  const text = repositoryNoticeText({
    ...changes,
    admin: props.org.role === 'admin' || props.suspended === true,
  })
  const failed = changes.wait === 'failed'
  return (
    <Notice
      body={text.body}
      busy={changes.wait === 'building'}
      icon={failed ? CircleAlert : Hammer}
      title={text.title}
      tone={failed ? 'danger' : 'neutral'}
    />
  )
}
