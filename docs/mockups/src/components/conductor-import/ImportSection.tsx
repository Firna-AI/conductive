import { ArrowDownToLine } from 'lucide-react'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkedControl } from '../common/LinkedControl'
import { Section } from '../settings/Section'

/**
 * The entry of the import in the settings of the Mac app, beside This Mac,
 * because the import reads the data of this Mac. It imports into the org
 * that the Mac app shows. The Mac app asks before its first read of the
 * data of Conductor. Only the Mac app shows the section. Choose workspaces
 * opens `to`, and null keeps it static. Without it, the button opens the
 * question of the first import.
 */
export function ImportSection(props: { to?: string | null }) {
  return (
    <Section
      actions={
        <LinkedControl
          to={props.to === undefined ? paths.macImportConsent : props.to}
        >
          <ActionButton icon={ArrowDownToLine}>Choose workspaces</ActionButton>
        </LinkedControl>
      }
      description={`Import your local Conductor workspaces, with their chats, into ${orgs.acme.name}.`}
      title="Import from Conductor"
    />
  )
}
