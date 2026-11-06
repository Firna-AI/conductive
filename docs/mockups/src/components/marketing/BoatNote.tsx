import { boatPages } from '../../fixtures/boatKey'
import { useOutsideHref } from '../common/ScreenLink'
import styles from './BoatNote.module.css'

/**
 * The line under the main action of the site: a user needs their own Boat
 * account, as decision 47 B says. The link opens the Boat sign-up.
 */
export function BoatNote() {
  const href = useOutsideHref(boatPages.signUp)
  return (
    <p className={styles.note}>
      You need your own{' '}
      <a className={styles.link} href={href} rel="noreferrer" target="_blank">
        Boat account
      </a>
      , which runs your cloud computers.
    </p>
  )
}
