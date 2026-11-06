import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { Loadable } from '../../app/store'
import { LoadFailure } from '../ui/LoadFailure'
import styles from './settings.module.css'

/**
 * A part of the settings that loads from the API: a quiet spinner while it
 * loads, the failure with Try again, and then the part itself.
 */
export function Loaded<T>(props: {
  value: Loadable<T>
  failure: string
  retry: () => Promise<void>
  children: (value: T) => ReactNode
}) {
  const theme = useSharedUiTheme()
  switch (props.value.state) {
    case 'loading':
      return (
        <div className={styles.loading}>
          <Spinner color={theme.colors.muted} size={14} />
        </div>
      )
    case 'failed':
      return (
        <LoadFailure
          error={props.value.error}
          retry={props.retry}
          title={props.failure}
        />
      )
    case 'ready':
      return props.children(props.value.value)
  }
}
