import { HttpError } from '../http'

export function invalidRoutineInput(): HttpError {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}

export function invalidSchedule(): HttpError {
  return new HttpError(
    400,
    'invalid_schedule',
    'Use five cron fields with one minute, for a schedule that runs at most once an hour.',
  )
}

export function routineNotFound(): HttpError {
  return new HttpError(
    404,
    'routine_not_found',
    'The routine is not available.',
  )
}

export function routineOwnerRequired(): HttpError {
  return new HttpError(
    403,
    'routine_owner_required',
    'Only the owner can change this routine.',
  )
}
