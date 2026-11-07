import type { RunnerEventRefused } from '../../shared/chat-events'
import { LostLine } from '../../../docs/mockups/src/components/chat/LostLine'
import type { LostWhat } from '../../../docs/mockups/src/components/chat/lostCopy'

/**
 * The data that each refused runner event carried, in the words of the chat.
 * The events of files, the start, and the title belong to no session, so a
 * session line names them only if a marker ever names a session for them.
 */
const lostData: Readonly<
  Record<RunnerEventRefused['runnerEventType'], LostWhat>
> = {
  'turn.started': 'turn-start',
  'turn.thinking': 'status',
  'assistant.delta': 'reply-part',
  'assistant.completed': 'reply',
  'tool.updated': 'tool-update',
  'turn.completed': 'turn-end',
  'turn.failed': 'turn-error',
  'files.snapshot': 'all-files',
  'files.changed': 'all-files',
  'changes.updated': 'changes',
  'start.updated': 'start-steps',
  'workspace.title': 'title',
  'runner.ready': 'update',
  unknown: 'update',
}

/**
 * The one line of a refused runner event of a session (decision 76). It
 * names the lost data and the reason in plain words, and shows no part of
 * the marker itself, such as its stream or its event number.
 */
export function LostEventLine(props: { marker: RunnerEventRefused }) {
  const { marker } = props
  return (
    <LostLine reason={marker.reason} what={lostData[marker.runnerEventType]} />
  )
}
