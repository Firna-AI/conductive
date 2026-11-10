import { ArrowDownToLine } from 'lucide-react'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { Section } from '../settings/Section'

/**
 * The entry of the import in the settings of the Mac app, beside This Mac,
 * because the import reads the data of this Mac. It imports into the org
 * that the Mac app shows. The Mac app asks before its first read of the
 * data of Conductor. Only the Mac app shows the section.
 */
export function ImportSection() {
  return (
    <Section
      actions={
        <ScreenLink asChild to={paths.macImportConsent}>
          <ActionButton icon={ArrowDownToLine}>Choose workspaces</ActionButton>
        </ScreenLink>
      }
      description={`Import your local Conductor workspaces, with their chats, into ${orgs.acme.name}.`}
      title="Import from Conductor"
    />
  )
}
