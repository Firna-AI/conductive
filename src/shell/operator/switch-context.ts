import { createContext, useContext } from 'react'
import type { OperatorSwitch } from '../../app/operator-switch'

/** The waitlist switch of the operator section, which each page shows. */
export const SwitchContext = createContext<OperatorSwitch | null>(null)

/** The waitlist switch that the operator section reads when a page opens. */
export function useOperatorSwitch(): OperatorSwitch {
  const waitlist = useContext(SwitchContext)
  if (!waitlist) throw new Error('The operator section has no waitlist switch.')
  return waitlist
}
