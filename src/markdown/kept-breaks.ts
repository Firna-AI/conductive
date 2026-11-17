/**
 * The line breaks that a block of Markdown draws, as "Line breaks" of
 * `chat-markdown.md` says, for the inline nodes of each view. Agent
 * messages and the file preview share it. This module imports no React.
 */

/**
 * A leaf of inline text in reading order: something that shows, such as
 * text, code, or a chip, text of spaces only, or a line break.
 */
export type BreakLeaf = 'shows' | 'blank' | 'break'

/**
 * How the rule reads the inline nodes of one view. A container, such as
 * bold text or a link, holds nodes. Each other node is a leaf.
 */
export interface BreakNodes<Node> {
  /** The nodes inside a container, or null for a leaf. */
  inner: (node: Node) => readonly Node[] | null
  /**
   * The container with the nodes that the rule keeps inside it, or null
   * when the container then leaves its block.
   */
  rebuilt: (node: Node, inner: Node[]) => Node | null
  /** What a leaf is to the rule. */
  leaf: (node: Node) => BreakLeaf
}

/** What a walk does at each leaf, and as it enters and leaves a container. */
interface Visit<Node> {
  leaf: (node: Node) => void
  enter: (node: Node) => void
  leave: () => void
}

/**
 * Walks the nodes in reading order. The walk keeps its own stack of the
 * containers that it is in, so a deep tree needs no deep recursion.
 */
function walk<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
  visit: Visit<Node>,
): void {
  const stack = [{ nodes, at: 0 }]
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (frame.at === frame.nodes.length) {
      stack.pop()
      if (stack.length > 0) visit.leave()
      continue
    }
    const node = frame.nodes[frame.at]
    frame.at += 1
    const inner = view.inner(node)
    if (inner === null) {
      visit.leaf(node)
      continue
    }
    visit.enter(node)
    stack.push({ nodes: inner, at: 0 })
  }
}

/**
 * The leaves of the nodes in reading order, and whether a container holds
 * no leaf, such as a link with an empty label.
 */
function leavesOf<Node>(nodes: readonly Node[], view: BreakNodes<Node>) {
  const leaves: BreakLeaf[] = []
  const starts: number[] = []
  let empty = false
  walk(nodes, view, {
    leaf: (node) => leaves.push(view.leaf(node)),
    enter: () => starts.push(leaves.length),
    leave: () => {
      if (starts.pop() === leaves.length) empty = true
    },
  })
  return { leaves, empty }
}

/**
 * The nodes with the leaves that `keep` keeps. Each container holds the
 * nodes that it keeps, as `rebuilt` gives it.
 */
function keptNodes<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
  keep: readonly boolean[],
): Node[] {
  const root: Node[] = []
  const open: { node: Node; kept: Node[] }[] = []
  const into = () => open.at(-1)?.kept ?? root
  let leaf = 0
  walk(nodes, view, {
    leaf: (node) => {
      if (keep[leaf]) into().push(node)
      leaf += 1
    },
    enter: (node) => open.push({ node, kept: [] }),
    leave: () => {
      const done = open.pop()
      const rebuilt = done ? view.rebuilt(done.node, done.kept) : null
      if (rebuilt !== null) into().push(rebuilt)
    },
  })
  return root
}

/**
 * Whether the nodes hold a leaf that shows, so that their block draws
 * something.
 */
export function showsText<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
): boolean {
  return leavesOf(nodes, view).leaves.includes('shows')
}

/**
 * The inline nodes of one block with the line breaks that it draws. The
 * rule reads the leaves of the whole block in reading order, also inside
 * marks and links. A break at the start or at the end of the block draws
 * nothing, so a block of only breaks draws nothing. Two or more breaks in
 * a row draw at most one empty line: text of spaces between them does not
 * end the row, and neither does a container that holds no leaf.
 */
export function keptBreaks<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
): Node[] {
  const { leaves, empty } = leavesOf(nodes, view)
  const first = leaves.indexOf('shows')
  const last = leaves.lastIndexOf('shows')
  const whole =
    first === 0 && last === leaves.length - 1 && !leaves.includes('break')
  if (whole && !empty) return [...nodes]
  let row = 0
  const keep = leaves.map((leaf, index) => {
    if (index < first || index > last) return false
    if (leaf === 'shows') row = 0
    else if (leaf === 'break') row += 1
    return row <= 2
  })
  return keptNodes(nodes, view, keep)
}
