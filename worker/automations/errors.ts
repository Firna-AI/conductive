import { HttpError } from '../http'

export function invalidAutomationInput(): HttpError {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}

export function invalidSchedule(): HttpError {
  return new HttpError(
    400,
    'invalid_schedule',
    'Use five cron fields with one minute, for a schedule that runs at most once an hour.',
  )
}

export function automationNotFound(): HttpError {
  return new HttpError(
    404,
    'automation_not_found',
    'The automation is not available.',
  )
}

export function automationOwnerRequired(): HttpError {
  return new HttpError(
    403,
    'automation_owner_required',
    'Only the owner can change this automation.',
  )
}
