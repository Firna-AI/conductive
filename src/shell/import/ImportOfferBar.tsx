import { useEffect, useState } from 'react'
import { ArrowDownToLine, X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/conductor-import/ImportOffer.module.css'
import { runImportOperation } from '../../app/import/import-operation'
import { routes } from '../../app/router'
import { createDeviceApi } from '../../chat/device/device-api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgServices } from '../context'
import { useMacApp } from '../mac/mac-app'
import { ActionButton, IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'

/**
 * Asks this Mac whether it offers the import: `status` says whether the
 * data of Conductor is on the Mac and whether the person dismissed the
 * offer, and `dismiss` hides it for good. It reads no data of Conductor.
 * The bar shows only after the Mac said that it offers the import.
 */
function useOffer(orgId: string) {
  const services = useOrgServices(orgId)
  const [shown, setShown] = useState(false)
  const [send] = useState(() => {
    let running: AbortController | null = null
    return (action: 'status' | 'dismiss') => {
      running?.abort()
      const stop = new AbortController()
      running = stop
      void (async () => {
        const pairing = await createDeviceApi(services.api)
          .current()
          .catch(() => null)
        if (!pairing || stop.signal.aborted) return
        await runImportOperation(
          services.api.fetch,
          orgId,
          { ...pairing, action },
          (event) => {
            if (event.kind !== 'status') return
            setShown(event.available && !event.dismissed)
          },
          stop.signal,
        )
      })()
      return () => stop.abort()
    }
  })
  useEffect(() => send('status'), [send])
  return {
    shown,
    dismiss: () => {
      setShown(false)
      send('dismiss')
    },
  }
}

function MacOffer(props: { org: OrgSummary }) {
  const { org } = props
  const go = useGo()
  const offer = useOffer(org.id)
  if (!offer.shown) return null
  return (
    <div
      aria-label="Import from Conductor"
      className={styles.bar}
      role="region"
    >
      <ArrowDownToLine aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        Import your Conductor workspaces, with their chats, into {org.name}.
      </span>
      <ActionButton onPress={() => go(routes.conductorImport(org.id))}>
        Import
      </ActionButton>
      <IconButton icon={X} label="Dismiss the offer" onPress={offer.dismiss} />
    </div>
  )
}

/**
 * The one-time offer of the Mac app when this Mac has the data of
 * Conductor, as a bar at the top of the main area of an org. Import opens
 * the page of the import, which asks before its first read. The close
 * button dismisses the offer on this Mac, and the Account page and the
 * command palette still lead to the import. A browser shows no offer and
 * sends nothing.
 */
export function ImportOfferBar(props: { org: OrgSummary }) {
  if (!useMacApp()) return null
  return <MacOffer key={props.org.id} org={props.org} />
}
