import {
  isIdleStopMinutes,
  type OperatorIdleStopResponse,
} from '../../shared/operator-idle-stop'
import { maybeCount, maybeNested, ParseError, record } from './parse'
import { readIdentity } from './read-operator-waitlist'

export function readOperatorIdleStop(value: unknown): OperatorIdleStopResponse {
  const reply = record(value, 'idleStop')
  const minutes = reply.minutes
  if (!isIdleStopMinutes(minutes))
    throw new ParseError('minutes is not a stop time.')
  return {
    minutes,
    updatedAt: maybeCount(reply, 'updatedAt'),
    operator: maybeNested(reply, 'operator', readIdentity),
  }
}
