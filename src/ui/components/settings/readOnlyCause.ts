/**
 * Why the settings show without edit fields and actions: the person signed
 * in is a member who is not an admin, or the operator suspended the org. A
 * member's view says that only an admin can change a value. The notice of a
 * suspended org says why, so its sections say nothing more.
 */
export type ReadOnlyCause = 'member' | 'suspended'
