export const archiveStateProperties = {
  /**
   * An archived workspace and its cloud computer. For 14 days after the
   * Archive, the workspace stays in the Archived group: `kept`, while it
   * names its cloud computer, so every member of an org that is not
   * suspended may restore it, `pending`, while an unresolved create request
   * or a delete that tries again can still hold a cloud computer that the
   * workspace does not name, so nothing offers Restore, or `none`, after the
   * app deleted its cloud computer, as after a failed first start. When the
   * 14 days end, Restore ends and the workspace leaves the list, and only a
   * link opens it: `removed-deleting`, while a failed delete of its cloud
   * computer tries again, or `removed`, after the delete.
   */
  archive: { enum: ['kept', 'pending', 'none', 'removed-deleting', 'removed'] },
} as const
