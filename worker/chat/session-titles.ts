import type { ChatTransaction } from './store'

export async function applyWorkspaceSessionTitle(
  transaction: ChatTransaction,
  title: string,
  occurredAt: number,
): Promise<void> {
  const first = await transaction.firstSession()
  if (!first || first.titleReceived) return
  await transaction.saveFirstSession({ ...first, titleReceived: true })
  const session = await transaction.session(first.id)
  if (!session || session.title !== first.workspaceName) return
  session.title = title
  await transaction.saveSession(session)
  await transaction.emit({ type: 'session.updated', session }, occurredAt)
}
