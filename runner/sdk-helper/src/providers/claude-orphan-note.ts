import { productName } from '../../../../src/shared/brand'

/** One task whose result reached a subagent that did not run again. */
export interface OrphanTask {
  id: string
  description: string
  owner: string
  ownerDescription: string
  status: 'completed' | 'failed' | null
  output: string | null
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function ending(status: OrphanTask['status']): string {
  if (status === 'completed') return 'It completed.'
  if (status === 'failed') return 'It failed.'
  return 'It ended.'
}

/**
 * The text follows the naming rules of the agent instructions. The chat
 * never shows it.
 */
export function orphanNote(tasks: readonly OrphanTask[]): string {
  return [
    `This is an automatic note from ${productName}, not a message from a member.`,
    'Background work ended, but the subagent that started it did not run again, so no agent acted on its result:',
    ...tasks.map((task) =>
      [
        `- Task ${task.id}, "${oneLine(task.description)}", started by subagent ${task.owner} ("${oneLine(task.ownerDescription)}").`,
        ending(task.status),
        task.output ? `Its output is in ${task.output}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    ),
    'Read the output of each task.',
    'Resume the subagent with SendMessage to its ID, or finish the work yourself.',
    'Then end your reply.',
  ].join('\n')
}
