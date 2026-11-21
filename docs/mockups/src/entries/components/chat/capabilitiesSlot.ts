import type { ReactNode } from 'react'
import type { CapabilitiesControl } from '../../../components/capabilities/CapabilitiesButton'
import type { ComposerState } from '../../../components/chat/Composer'
import { defined, plainData } from '../../../defined'

/** The Capabilities icon of a message box as data, without its control. */
type CapabilitiesData = Omit<CapabilitiesControl, 'panel'>

/**
 * The Capabilities icon of a message box as data, with its open control
 * apart. A screen draws the open control, and the props of a Mokly part
 * are JSON, so a part takes the control in its `capabilitiesPanel` slot.
 */
export function capabilitiesData(control: CapabilitiesControl | undefined): {
  capabilities?: CapabilitiesData
  capabilitiesPanel?: ReactNode
} {
  if (control === undefined) return {}
  const { panel, ...capabilities } = control
  return defined({
    capabilities: plainData(capabilities),
    capabilitiesPanel: panel,
  })
}

/** The Capabilities icon with the open control of the slot of a part. */
export function withPanel(
  capabilities: CapabilitiesData | undefined,
  panel: ReactNode,
): CapabilitiesControl | undefined {
  if (panel === undefined || panel === null) return capabilities
  return { ...capabilities, panel }
}

/**
 * The state of a message box as data, and its open Capabilities control
 * and the picker in place of its model picker apart, for a part that takes
 * them in slots.
 */
export function composerData(state: ComposerState): {
  composer: ComposerState
  capabilitiesPanel?: ReactNode
  pickerPart?: ReactNode
} {
  const { capabilities, pickerPart, ...rest } = state
  const parts = capabilitiesData(capabilities)
  return {
    composer: { ...rest, ...defined({ capabilities: parts.capabilities }) },
    ...defined({ capabilitiesPanel: parts.capabilitiesPanel, pickerPart }),
  }
}

/**
 * The state of a message box with the open control and the picker of the
 * slots of a part.
 */
export function withComposerPanel(
  state: ComposerState,
  panel: ReactNode,
  pickerPart?: ReactNode,
): ComposerState {
  const picked =
    pickerPart === undefined || pickerPart === null
      ? state
      : { ...state, pickerPart }
  if (panel === undefined || panel === null) return picked
  return { ...picked, capabilities: withPanel(state.capabilities, panel) }
}
