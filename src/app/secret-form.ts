import type { ApiError } from './api/client'
import { asApiError, Store } from './store'

export interface SecretState {
  saving: boolean
  error: ApiError | null
  /** The user pressed save on an empty field, so the field asks for the secret. */
  missing: boolean
}

export interface SecretOptions {
  /**
   * The value goes out as typed: it may be empty, and its spaces stay, as
   * the value of an env var may. Without it, a key or a token loses the
   * spaces around it, and an empty field saves nothing.
   */
  raw?: boolean
}

const idle: SecretState = { saving: false, error: null, missing: false }

/**
 * The field of a secret, such as a Boat key, an agent login, or an env var
 * value. The secret leaves the browser in one write, and the field is empty
 * again after the save. A refused secret stays in the field, so the user
 * can fix it.
 */
export class SecretForm {
  readonly value = new Store('')
  readonly state = new Store<SecretState>(idle)
  private readonly raw: boolean

  constructor(options: SecretOptions = {}) {
    this.raw = options.raw ?? false
  }

  set(value: string): void {
    this.value.set(value)
    const state = this.state.get()
    if (state.error || state.missing) this.state.set(idle)
  }

  /** Saves the secret. It returns `true` when the save succeeded. */
  async submit(save: (secret: string) => Promise<void>): Promise<boolean> {
    if (this.state.get().saving) return false
    const secret = this.raw ? this.value.get() : this.value.get().trim()
    if (secret === '' && !this.raw) {
      this.state.set({ ...idle, missing: true })
      return false
    }
    this.state.set({ ...idle, saving: true })
    try {
      await save(secret)
    } catch (error) {
      this.state.set({ ...idle, error: asApiError(error) })
      return false
    }
    this.value.set('')
    this.state.set(idle)
    return true
  }
}
