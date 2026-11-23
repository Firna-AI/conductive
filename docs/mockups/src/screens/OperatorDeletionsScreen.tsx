import type { SchemaProps, Viewport } from '@mokly/mokly'
import { DirectoryTable } from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import {
  deletionCell,
  deletionColumns,
  EmptyDeletions,
} from '../components/operator/deletions'
import { deletionCopy } from '../components/operator/deletionCopy'
import { deletionRequests } from '../fixtures/deletionRequests'

export const operatorDeletionsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list'],
  properties: {
    /** The requests that wait for an operator, oldest first, or none. */
    list: { enum: ['requests', 'empty'] },
  },
} as const

export type OperatorDeletionsState = SchemaProps<typeof operatorDeletionsSchema>

/**
 * The Deletions tab of the operator: the account deletion requests that
 * wait, oldest first, from decision 4 A of the universal Expo app plan.
 * Each login opens the page of the user. The tab has no search, because
 * the list holds only the requests that wait, and the Users tab finds any
 * user. It offers no action on a request.
 */
export function OperatorDeletionsScreen(props: {
  state: OperatorDeletionsState
  viewport: Viewport
}) {
  return (
    <OperatorPage tab="deletions" title="Operator" viewport={props.viewport}>
      {props.state.list === 'empty' ? (
        <EmptyDeletions />
      ) : (
        <DirectoryTable
          cell={deletionCell}
          columns={deletionColumns}
          empty={deletionCopy.empty.title}
          more={false}
          rowKey={(request) => request.login}
          rows={deletionRequests}
          summary={deletionCopy.summary(deletionRequests.length)}
          title={deletionCopy.title}
          viewport={props.viewport}
        />
      )}
    </OperatorPage>
  )
}
