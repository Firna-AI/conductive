import { mkdir, realpath } from 'node:fs/promises'
import type { ImportLocationsInput } from './types.ts'

/** Only trusted home and app-owned data roots are resolved, never descendants. */
export class ImportLocations {
  declare private readonly canonical: true
  readonly home: string
  readonly userData: string
  readonly xdgConfigHome: string

  private constructor(
    input: ImportLocationsInput,
    home: string,
    userData: string,
  ) {
    this.home = home
    this.userData = userData
    this.xdgConfigHome =
      input.xdgConfigHome ?? process.env.XDG_CONFIG_HOME ?? ''
  }

  static async create(input: ImportLocationsInput): Promise<ImportLocations> {
    await mkdir(input.userData, { recursive: true, mode: 0o700 })
    const [home, userData] = await Promise.all([
      realpath(input.home),
      realpath(input.userData),
    ])
    return new ImportLocations(input, home, userData)
  }
}
