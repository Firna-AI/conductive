import { HttpError } from '../http'

export function lastActiveAdminError(): HttpError {
  return new HttpError(
    409,
    'last_admin',
    'Make another member whose account is not suspended an admin first.',
  )
}

export function suspendedOwnerRecipientError(): HttpError {
  return new HttpError(
    409,
    'owner_suspended',
    'The selected member is suspended. Choose another member.',
  )
}
