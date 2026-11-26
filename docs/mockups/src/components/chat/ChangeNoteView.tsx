import { people, type PersonKey } from '../../fixtures/members'
import { CapabilityChangeLine } from '../../../../../src/ui/components/chat/CapabilityChangeLine'
import { RepositoryChangedLine } from '../../../../../src/ui/components/chat/RepositoryChangedLine'
import { continuedLine } from '../../entries/components/chat/ContinuedLine.mockup'
import type { SingleItem } from './groupItems'

/** A note of the app about a change of the workspace, which no turn owns. */
export type ChangeNoteItem = Extract<
  SingleItem,
  { kind: 'continued' | 'repository-changed' | 'capabilities-changed' }
>

/**
 * The note of Continue, of a repository change, or of a change of the
 * capabilities. Each note says "You" to the member who made the change.
 */
export function ChangeNoteView(props: {
  item: ChangeNoteItem
  viewer: PersonKey
}) {
  const { item, viewer } = props
  const who = item.by === viewer ? 'You' : people[item.by].name
  switch (item.kind) {
    case 'continued':
      return (
        <continuedLine.Component
          base={item.base}
          branch={item.branch}
          moklyInstance="continued-line"
          who={who}
        />
      )
    case 'repository-changed':
      return (
        <RepositoryChangedLine
          branch={item.branch}
          repository={item.repository}
          who={who}
        />
      )
    case 'capabilities-changed':
      return <CapabilityChangeLine changes={item.changes} who={who} />
  }
}
