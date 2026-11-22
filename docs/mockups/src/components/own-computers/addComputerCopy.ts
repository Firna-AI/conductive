import { productDomain } from '../../brand'
import type { ComputerResources } from './ownComputer'

/**
 * The words of the Add computer dialog: the name, the install command with
 * its one-time code, the wait for the first connection, the first
 * connection, and a code that expired. The mockups and the app share them,
 * so this module imports no fixture.
 */
export const addComputerWords = {
  title: 'Add own computer',
  body: (org: string) =>
    `A Linux server that runs workspaces of ${org}, each in its own container.`,
  trust:
    'People with root access to the server can read the work, the env vars, and the allowed secrets of each workspace on it.',
  name: 'Name',
  nameHint: 'Members see it when they choose where a workspace runs.',
  cancel: 'Cancel',
  continue: 'Continue',
  installTitle: (name: string) => `Install on ${name}`,
  installBody: 'Run this command on the server, as a user who can use sudo.',
  copy: 'Copy the command',
  codeNote: 'The code in the command works once, within 1 hour.',
  needs: 'The server needs Linux on x86_64, with systemd and Podman.',
  waiting: (name: string) => `Waiting for ${name} to connect`,
  close: 'Close',
  connectedTitle: (name: string) => `${name} is connected`,
  connectedBody: (org: string) =>
    `It builds the setup of ${org} now. Workspaces can start on it when the build succeeds.`,
  connectedLimit: (name: string, limit: number, resources: ComputerResources) =>
    `${name} runs up to ${limit} workspaces at once, for its ${resources.cpus} vCPU and ${resources.memoryGb} GB. You can change this on its page.`,
  done: 'Done',
  expiredTitle: 'The code expired',
  expiredBody: (name: string) =>
    `${name} did not connect within 1 hour. Get a new code, then run the new command on the server.`,
  newCode: 'New code',
  remove: (name: string) => `Remove ${name}`,
} as const

/**
 * The one-line install command of a computer, with its one-time code. It
 * installs the program `conductive` in computer mode, which connects the
 * server to the org.
 */
export function installCommand(code: string): string {
  return `curl -fsSL https://${productDomain}/install-computer | sh -s -- --code ${code}`
}
