import { RotateCw, Square } from 'lucide-react'
import type { MenuEntry } from '../../../../../src/ui/components/common/Menu'
import {
  servicesCopy,
  type ServicePhase,
} from '../../../../../src/ui/components/tools/serviceCopy'

/**
 * The items of the menu of a service row, beside its button on desktop and
 * in a sheet on a phone. Restart runs the saved command again at once.
 * Stop asks first, and it is off while the service does not run.
 */
export function serviceMenu(phase: ServicePhase): MenuEntry[] {
  return [
    {
      kind: 'item',
      label: servicesCopy.restart,
      icon: RotateCw,
      highlighted: true,
    },
    {
      kind: 'item',
      label: servicesCopy.stop,
      icon: Square,
      tone: 'danger',
      disabled: phase.kind !== 'running',
    },
  ]
}
