import type { ReactNode } from 'react'
import { Camera, Flashlight, Lock } from 'lucide-react'
import { productName } from '../../../../../src/shared/brand'
import { classes } from '../../../../../src/ui/components/common/classes'
import { logoTile } from '../../entries/components/brand/Logo.mockup'
import type { PhoneNotice } from '../../fixtures/phoneNotices'
import { ScreenLink } from '../common/ScreenLink'
import { noticeKindCopy } from './noticeCopy'
import styles from './LockScreen.module.css'

/**
 * One notice as the system draws it: the app icon, the app name, and the
 * age, then the title that the app sends, the workspace name, and its text,
 * the kind of the event. A notice with a page opens its workspace there.
 */
function NoticeCard(props: { notice: PhoneNotice }) {
  const { notice } = props
  const content = (
    <>
      <logoTile.Component
        moklyInstance={`notice-icon-${notice.kind}`}
        size={36}
      />
      <span className={styles.text}>
        <span className={styles.top}>
          <span className={styles.app}>{productName}</span>
          <span className={styles.age}>{notice.time}</span>
        </span>
        <span className={styles.title}>{notice.title}</span>
        <span className={styles.body}>{noticeKindCopy[notice.kind]}</span>
      </span>
    </>
  )
  if (notice.to === undefined) {
    return <div className={styles.notice}>{content}</div>
  }
  return (
    <ScreenLink className={classes(styles.notice, styles.link)} to={notice.to}>
      {content}
    </ScreenLink>
  )
}

/** A round control of the lock screen, such as the camera. */
function RoundControl(props: { label: string; children: ReactNode }) {
  return (
    <span aria-label={props.label} className={styles.round} role="img">
      {props.children}
    </span>
  )
}

/**
 * The lock screen of a phone, or of a tablet in landscape: the time, the
 * date, and the notices, newest first. It follows iOS in neutral shapes,
 * over a plain wallpaper in the colours of the scheme. A notice links to
 * its page, where the catalogue has one.
 */
export function LockScreen(props: {
  layout: 'phone' | 'tablet'
  time: { time: string; date: string }
  notices: readonly PhoneNotice[]
}) {
  const phone = props.layout === 'phone'
  return (
    <main
      aria-label="Lock screen"
      className={classes(styles.screen, !phone && styles.tablet)}
    >
      <div className={styles.clock}>
        <Lock aria-hidden className={styles.lock} size={16} />
        <p className={styles.date}>{props.time.date}</p>
        <p className={styles.time}>{props.time.time}</p>
      </div>
      <ul aria-label="Notices" className={styles.notices}>
        {props.notices.map((notice) => (
          <li key={notice.kind}>
            <NoticeCard notice={notice} />
          </li>
        ))}
      </ul>
      {phone ? (
        <div className={styles.controls}>
          <RoundControl label="Flashlight">
            <Flashlight aria-hidden size={18} />
          </RoundControl>
          <RoundControl label="Camera">
            <Camera aria-hidden size={18} />
          </RoundControl>
        </div>
      ) : null}
      <span aria-hidden className={styles.home} />
    </main>
  )
}
