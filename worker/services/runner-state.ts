import type { ServiceBinding } from './binding'

export interface ServiceRunnerState {
  generation: number
  services?: boolean
  serviceBinding?: ServiceBinding
}
