export const PORT_REPORT_MAX_PORTS = 64
export const PORT_NAME_MAX_CHARACTERS = 40
export const PORT_FOLDER_MAX_CHARACTERS = 120

export interface ListeningPort {
  port: number
  name: string | null
  folder: string | null
}

export interface RunnerPortsUpdated {
  type: 'ports.updated'
  ports: readonly ListeningPort[]
}

export interface PortsUpdated {
  type: 'ports.updated'
  /** Null means that this workspace has no current runner report. */
  ports: readonly ListeningPort[] | null
}
