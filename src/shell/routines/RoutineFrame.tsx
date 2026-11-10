import type { ReactNode } from 'react'
import styles from '../../../docs/mockups/src/screens/RoutineScreen.module.css'
import { routes } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import { Page } from '../layout/Page'
import { useViewport } from '../ui/viewport'

/**
 * The frame of the routine page: Routines as the way back, the name, and
 * the actions, over the form. A desktop centres the form, and a phone
 * scrolls it.
 */
export function RoutineFrame(props: {
  org: OrgSummary
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  const phone = useViewport() === 'phone'
  return (
    <Page
      actions={props.actions}
      back={{ label: 'Routines', to: routes.routines(props.org.id) }}
      backOnDesktop
      fill
      subtitle="Routine"
      title={props.title}
    >
      {phone ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>{props.children}</div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>{props.children}</div>
          </div>
        </div>
      )}
    </Page>
  )
}
