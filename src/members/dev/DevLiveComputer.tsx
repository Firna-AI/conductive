import { useState } from 'react'
import type { Org } from '../../shared/api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { MemberComputerView } from '../MemberComputerView'
import type { Viewport } from '../ui/controls'
import { liveComputer, withFinishedBuild, withNextLogLine } from './devComputer'
import styles from './DevHost.module.css'

/**
 * The controlled computer view, with data that changes while the view stays
 * mounted, as Milestone 15i gives it from the live builds of its admin tab.
 * Two dev buttons give the mounted view new props. There is no transport.
 */
export function DevLiveComputer(props: { org: Org; viewport: Viewport }) {
  const [live, setLive] = useState(liveComputer)
  return (
    <>
      <MemberComputerView
        builds={live.builds}
        log={live.log}
        now={FAKE_TIME}
        org={props.org}
        settings={live.settings}
        viewport={props.viewport}
      />
      <div className={styles.devControls}>
        <span className={styles.note}>Dev page: new props for the view</span>
        <button
          className={styles.devButton}
          onClick={() => setLive(withNextLogLine)}
          type="button"
        >
          Add a log line
        </button>
        <button
          className={styles.devButton}
          onClick={() => setLive(withFinishedBuild)}
          type="button"
        >
          Finish the build
        </button>
      </div>
    </>
  )
}
