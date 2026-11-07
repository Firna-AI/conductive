import { readFile, readdir } from 'node:fs/promises'
import { Git } from '../src/git'

export async function gitStorage(root: string) {
  const git = new Git(root)
  const [indexPath, objectPath] = await Promise.all([
    git.run(['rev-parse', '--path-format=absolute', '--git-path', 'index']),
    git.run(['rev-parse', '--path-format=absolute', '--git-path', 'objects']),
  ])
  const index = await readFile(indexPath.toString().replace(/\n$/, ''))
  const files = await readdir(objectPath.toString().replace(/\n$/, ''), {
    recursive: true,
  })
  return { index, objects: files.sort() }
}
