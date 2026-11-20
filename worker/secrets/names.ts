import {
  SECRET_NAME_ERROR,
  validSecretName,
} from '../../src/shared/secret-names'
import { HttpError } from '../http'

export function requireSecretName(name: string): void {
  if (!validSecretName(name))
    throw new HttpError(400, 'invalid_secret_name', SECRET_NAME_ERROR)
}
