import { ArrowDownToLine } from 'lucide-react'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { useKeptOrg } from '../mac/mac-app'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'

/**
 * The entry of the import in the account of the Mac app, after This Mac,
 * because the import reads the data of this Mac. It imports into the org
 * that the Mac app shows. Choose workspaces opens the page of the import,
 * which asks before its first read. A browser, and an account with no
 * open org, show nothing.
 */
export function ImportSection() {
  const app = useApp()
  const go = useGo()
  const org = useKeptOrg(useStore(app.orgs))
  if (!org) return null
  return (
    <Section
      actions={
        <ActionButton
          icon={ArrowDownToLine}
          onPress={() => go(routes.conductorImport(org.id))}
        >
          Choose workspaces
        </ActionButton>
      }
      description={`Import your local Conductor workspaces, with their chats, into ${org.name}.`}
      title="Import from Conductor"
    />
  )
}
