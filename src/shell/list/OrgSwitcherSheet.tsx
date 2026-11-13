import { Fragment } from 'react'
import { Check, Gauge, Plus } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import orgDrag from '../../../docs/mockups/src/components/orgs/OrgDrag.module.css'
import styles from '../../../docs/mockups/src/screens/WorkspaceListScreen.module.css'
import { activeOrgs } from '../../app/kept-org'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { LiftedOrg, OrgDropLine } from '../orgs/OrgDragParts'
import { useOrgDrag } from '../orgs/useOrgDrag'
import { useOrgMove } from '../orgs/useOrgMove'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'
import { Sheet } from '../ui/Sheet'
import ui from '../ui/ui.module.css'
import list from './list.module.css'

/** The square and the name of an org in a row of the org switcher. */
function OrgRowContent(props: { org: OrgSummary; current: boolean }) {
  const { org, current } = props
  return (
    <>
      <OrgTile current={current} org={org} size={26} />
      <span className={styles.sheetLabel}>{org.name}</span>
      {current ? (
        <Check aria-hidden className={styles.check} size={15} />
      ) : null}
    </>
  )
}

/**
 * The org switcher of a phone, which has no rail: every org in the order of
 * the person, without deleted orgs, Create org, and the account. An operator also gets Operator
 * under the account. A long press on an org lifts it, and the finger drops
 * it at a new place, as the rail does (decision 515 C). The long press opens
 * no menu, also when it ends without a move, and a drop keeps the sheet
 * open. A drag does not scroll the sheet near its edges.
 */
export function OrgSwitcherSheet(props: {
  current: string
  user: User
  close: () => void
}) {
  const app = useApp()
  const orgs = activeOrgs(useStore(app.orgs))
  const operator = useStore(app.account.account)?.operator === true
  const drag = useOrgDrag(orgs, useOrgMove())
  return (
    <Sheet close={props.close} title="Orgs">
      <nav aria-label="Orgs">
        <span className={ui.hidden} role="status">
          {drag.status}
        </span>
        <ul className={styles.sheetList}>
          {orgs.map((org, index) => (
            <Fragment key={org.id}>
              {drag.lineBefore === org.id ? <OrgDropLine at="sheet" /> : null}
              <li
                {...drag.bind(org, index)}
                className={list.dragSurface}
                ref={drag.itemRef(org.id)}
              >
                <AppLink
                  aria-current={org.id === props.current ? 'page' : undefined}
                  className={classes(
                    styles.sheetRow,
                    drag.dragged?.id === org.id && orgDrag.placeholder,
                  )}
                  onClick={props.close}
                  to={routes.org(org.id)}
                >
                  <OrgRowContent current={org.id === props.current} org={org} />
                </AppLink>
              </li>
            </Fragment>
          ))}
          {drag.lineAtEnd ? <OrgDropLine at="sheet" /> : null}
          <li>
            <AppLink
              className={styles.sheetRow}
              onClick={props.close}
              to={routes.createOrg()}
            >
              <span className={styles.createTile}>
                <Plus aria-hidden size={15} />
              </span>
              <span className={styles.sheetLabel}>Create org</span>
            </AppLink>
          </li>
        </ul>
        <hr className={styles.sheetDivider} />
        <AppLink
          className={styles.sheetRow}
          onClick={props.close}
          to={routes.account()}
        >
          <PersonAvatar person={props.user} size={26} />
          <span className={styles.sheetLabel}>Account</span>
        </AppLink>
        {operator ? (
          <AppLink
            className={styles.sheetRow}
            onClick={props.close}
            to={routes.operator()}
          >
            <span className={styles.operatorTile}>
              <Gauge aria-hidden size={15} />
            </span>
            <span className={styles.sheetLabel}>Operator</span>
          </AppLink>
        ) : null}
      </nav>
      {drag.dragged && drag.lifted ? (
        <LiftedOrg at="sheet" frame={drag.lifted}>
          <span className={styles.sheetRow}>
            <OrgRowContent
              current={drag.dragged.id === props.current}
              org={drag.dragged}
            />
          </span>
        </LiftedOrg>
      ) : null}
    </Sheet>
  )
}
