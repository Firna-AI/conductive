/**
 * The repository of the workspace records in the stream of the files store.
 * A repository change moves the workspace to the folder of another
 * repository, so the lists of the store are then of the old folder.
 */
export class RepositoryWatch {
  private repositoryId: string | null = null

  /**
   * Whether this record of the workspace names another repository than the
   * record before it. The first record only sets the repository. An event
   * that is not a record of the workspace gives null and changes nothing.
   */
  moved(repositoryId: string | null): boolean {
    if (repositoryId === null) return false
    const before = this.repositoryId
    this.repositoryId = repositoryId
    return before !== null && before !== repositoryId
  }
}
