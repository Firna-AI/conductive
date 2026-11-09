import { createContext, useContext } from 'react'
import type { OperatorPause } from '../../app/operator-pause'

/** The pause of sign-ups of the operator section, which each page shows. */
export const PauseContext = createContext<OperatorPause | null>(null)

/** The pause of sign-ups that the operator section reads when a page opens. */
export function useOperatorPause(): OperatorPause {
  const pause = useContext(PauseContext)
  if (!pause) throw new Error('The operator section has no pause.')
  return pause
}
