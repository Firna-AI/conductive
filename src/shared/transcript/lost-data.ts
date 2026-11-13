import type { RunnerEventRefused } from '../chat-events'
import type { LostWhat } from '../../../docs/mockups/src/components/chat/lostCopy'

/**
 * The data that each refused runner event carried, in the words of the chat.
 * The events of files, the start, and the title belong to no session, so a
 * session line names them only if a marker ever names a session for them.
 */
export const lostData: Readonly<
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
  'files.unavailable': 'all-files',
  'files.changed': 'all-files',
  'changes.updated': 'changes',
  'ports.updated': 'servers',
  'skills.updated': 'update',
  'start.updated': 'start-steps',
  'workspace.title': 'title',
  'runner.ready': 'update',
  unknown: 'update',
}
