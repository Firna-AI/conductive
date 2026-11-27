import { actionButton } from '../../entries/components/common/actions.mockup'
import type { BuildState } from './BuildSection'

/** The action of the build head. A member who is not an admin gets none. */
export function HeadAction(props: { state: BuildState; readOnly: boolean }) {
  if (props.readOnly) return null
  switch (props.state) {
    case 'building':
    case 'waiting':
      return (
        <actionButton.Component
          disabled
          icon="hammer"
          moklyInstance="build-action"
        >
          Build computer
        </actionButton.Component>
      )
    case 'failed':
    case 'time-limit':
    case 'ended':
      return (
        <actionButton.Component
          icon="rotate-cw"
          moklyInstance="build-action"
          tone="primary"
        >
          Try again
        </actionButton.Component>
      )
    case 'none':
      return (
        <actionButton.Component
          icon="hammer"
          moklyInstance="build-action"
          tone="primary"
        >
          Build computer
        </actionButton.Component>
      )
    case 'ready':
      return (
        <actionButton.Component icon="hammer" moklyInstance="build-action">
          Build computer
        </actionButton.Component>
      )
  }
}
