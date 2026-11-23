import { ChevronRight } from 'lucide-react'
import type { Build } from '../../fixtures/computer'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { instanceKey } from '../../instanceKey'
import styles from '../../../../../src/ui/components/settings/BuildSection.module.css'

/**
 * A build as the data of its result: its time, its result, and its length,
 * without the saved message of a failed build. A Mokly part takes only the
 * fields of its schema.
 */
export function buildOf(build: Build): Build {
  return { when: build.when, result: build.result, duration: build.duration }
}

/**
 * The result of a build that ended: its length, and whether it failed.
 * `id` names the result for Mokly, such as the time of its build.
 */
export function BuildResult(props: { build: Build; id: string }) {
  const { build } = props
  const name = `result-${props.id}`
  if (build.result === 'failed') {
    return (
      <statusText.Component
        icon="circle-alert"
        label={`Failed after ${build.duration}`}
        moklyInstance={name}
        tone="danger"
      />
    )
  }
  return (
    <statusText.Component
      label={`Succeeded in ${build.duration}`}
      moklyInstance={name}
      tone="success"
    />
  )
}

/**
 * The builds of the computer that ended, newest first, each with its time
 * and result. It shows once a build has ended.
 */
export function BuildHistory(props: {
  builds: readonly Build[]
  open: boolean
}) {
  if (props.builds.length === 0) return null
  return (
    <details className={styles.history} open={props.open}>
      <summary className={styles.summary}>
        <ChevronRight aria-hidden className={styles.chevron} size={14} />
        History ({props.builds.length})
      </summary>
      <ul aria-label="Builds" className={styles.builds}>
        {props.builds.map((build, index) => (
          <li className={styles.build} key={index}>
            <span className={styles.when}>{build.when}</span>
            {/* A build has no key: its time, result, and length name it. */}
            <BuildResult
              build={build}
              id={instanceKey(
                `${build.when} ${build.result} ${build.duration}`,
              )}
            />
          </li>
        ))}
      </ul>
    </details>
  )
}
