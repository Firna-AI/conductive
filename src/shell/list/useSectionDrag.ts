import { usePointerDrag, type PointerDrag } from '../../app/pointer-drag'
import type { Section } from '../../shared/sections'
import type { DropLayout } from './drop-target'

/**
 * A drag of a section. Its item is the section, and its places are indexes
 * in the list that count the sections without the dragged one.
 */
export type SectionDragState = PointerDrag<Section, number>

/**
 * Drag and drop of sections, on the shared pointer drag: a mouse drags the
 * name of a section after a short move, and a finger lifts it after a long
 * press. The section lands before the first other section whose middle is
 * below the pointer. A release at its own place moves nothing, also after
 * a long press that lets go without a move. The Archived group is no
 * place, because the layout holds only the sections.
 */
export function useSectionDrag(
  layout: DropLayout,
  moveTo: (section: Section, index: number) => void,
) {
  return usePointerDrag<Section, number>({
    locate: (section, _x, y) => layout.sectionIndexAt(section.id, y),
    drop: ({ item, from, place }) => {
      if (place !== from) moveTo(item, place)
    },
  })
}
