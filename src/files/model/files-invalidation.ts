import type { SyncStep } from './files-sync'

interface Versions {
  epoch: number
  versions: ReadonlyMap<string, number>
}

/** Collects one message's invalidation before copying the versions once. */
export class FilesInvalidation {
  private epochs = 0
  private readonly paths = new Map<string, number>()

  add(step: SyncStep): void {
    if (step.allTouched) this.epochs += 1
    step.touched.forEach((path) => {
      this.paths.set(path, (this.paths.get(path) ?? 0) + 1)
    })
  }

  apply(current: Versions): Versions {
    let versions = current.versions
    if (this.paths.size > 0) {
      const updated = new Map(versions)
      this.paths.forEach((count, path) => {
        updated.set(path, (updated.get(path) ?? 0) + count)
      })
      versions = updated
    }
    return { epoch: current.epoch + this.epochs, versions }
  }
}
