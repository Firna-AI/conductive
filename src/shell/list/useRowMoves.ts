import type { Workspace } from '../../shared/generated/Workspace'
import { useState, type KeyboardEvent } from 'react'
import { treeOf } from '../../app/list-trees'
import { queueStep, type QueueBlock } from '../../app/merge-queue'
import { stepTarget, type SectionGroup } from '../../app/sections'
import { workspaceRowMove } from '../../app/shortcuts/navigation'
import { nameLabel } from '../../shared/name-label'
import type { DropTarget } from './drop-target'
import { carriedText } from './RowDrop'
import type { SectionActions } from './SectionHeader'

/** The nested rows that move with a top-level row: its tree without it. */
export function carriedBy(
  groups: readonly SectionGroup[],
  workspaceId: string | undefined,
): Set<string> {
  if (workspaceId === undefined) return new Set()
  const tree = groups
    .map((group) => treeOf(group.rows, workspaceId))
    .find((rows) => rows.length > 0)
  return new Set(tree?.slice(1).map((row) => row.workspace.id))
}

/**
 * The moves of a focused row by Alt with Up or Down and no other modifier,
 * and what each move says to a screen reader. A top-level row of an open
 * section moves its tree past the tree above or below it, also into the next open
 * section. A row of the Merge queue group moves its unit past the unit
 * above or below it, only inside its block (decision 315). A key with more
 * modifiers, such as ⌥⌘↑, stays free for its shortcut. The move items of
 * the menu of a section say the new place of the section too.
 */
export function useRowMoves(props: {
  groups: readonly SectionGroup[]
  blocks: readonly QueueBlock[]
  actions: SectionActions
  move: (workspaceId: string, target: DropTarget) => void
  queueMove?: (workspaceId: string, beforeWorkspaceId: string | null) => void
}) {
  const [announcement, setAnnouncement] = useState('')
  const actions: SectionActions = {
    ...props.actions,
    moveTo: (section, index) => {
      setAnnouncement(`${section.name} moves to place ${index + 1}.`)
      props.actions.moveTo(section, index)
    },
  }
  const sectionKey = (
    workspace: Workspace,
    event: KeyboardEvent<HTMLElement>,
    collapsed: boolean,
  ) => {
    const move = workspaceRowMove(event.nativeEvent)
    if (move === null) return
    event.preventDefault()
    if (collapsed) return
    const target = stepTarget(
      props.groups,
      workspace.id,
      move === 'up' ? -1 : 1,
    )
    if (!target) return
    const section = props.groups.find(
      (group) => group.section.id === target.sectionId,
    )
    const tree = carriedBy(props.groups, workspace.id).size
    setAnnouncement(
      `${nameLabel(workspace.name)}${carriedText(tree)} ${tree > 0 ? 'move' : 'moves'} to ${section?.section.name ?? 'another section'}, place ${target.index + 1}.`,
    )
    props.move(workspace.id, target)
  }
  const queueKey = (
    workspace: Workspace,
    event: KeyboardEvent<HTMLElement>,
  ) => {
    const move = workspaceRowMove(event.nativeEvent)
    if (move === null) return
    event.preventDefault()
    const block = props.blocks.find(
      (item) => item.repositoryId === workspace.repositoryId,
    )
    const step =
      block && queueStep(block.entries, workspace.id, move === 'up' ? -1 : 1)
    if (!step || !props.queueMove) return
    setAnnouncement(
      `${nameLabel(workspace.name)} moves to place ${step.place} of the merge queue.`,
    )
    props.queueMove(workspace.id, step.before)
  }
  return { announcement, actions, sectionKey, queueKey }
}
