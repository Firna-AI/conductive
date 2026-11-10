import { readdir, readFile, readlink } from 'node:fs/promises'

import type { ListeningPort } from '../../src/shared/ports'
import { portFolder, portName } from './port-metadata'
import { listeningSockets, type ListeningSocket } from './socket-table'

export interface ProcReader {
  read(path: string): Promise<unknown>
  list(path: string): Promise<unknown>
  link(path: string): Promise<unknown>
}

export interface ProcPortOptions {
  uid: number
  home: string
  cwd: string
  reader?: ProcReader
}

const diskReader: ProcReader = {
  read: (path) => readFile(path, 'utf8'),
  list: (path) => readdir(path),
  link: (path) => readlink(path),
}

export class ProcPortScanner {
  private readonly options: ProcPortOptions
  private readonly reader: ProcReader
  private metadata = new Map<string, Pick<ListeningPort, 'name' | 'folder'>>()

  constructor(options: ProcPortOptions) {
    this.options = options
    this.reader = options.reader ?? diskReader
  }

  async scan(): Promise<ListeningPort[]> {
    const tables = await Promise.all([
      this.reader.read('/proc/net/tcp'),
      this.reader.read('/proc/net/tcp6'),
    ])
    const sockets = [
      ...listeningSockets(tables[0], false, this.options.uid),
      ...listeningSockets(tables[1], true, this.options.uid),
    ].sort(
      (left, right) =>
        left.port - right.port || left.identity.localeCompare(right.identity),
    )
    const missing = sockets.filter(
      (socket) => !this.metadata.has(socket.identity),
    )
    const resolved = await this.findMetadata(missing)
    const current = new Map<string, Pick<ListeningPort, 'name' | 'folder'>>()
    const ports = new Map<number, ListeningPort>()
    for (const socket of sockets) {
      const metadata = this.metadata.get(socket.identity) ??
        resolved.get(socket.inode) ?? { name: null, folder: null }
      current.set(socket.identity, metadata)
      if (!ports.has(socket.port))
        ports.set(socket.port, { port: socket.port, ...metadata })
    }
    this.metadata = current
    return [...ports.values()]
  }

  private async findMetadata(sockets: ListeningSocket[]) {
    const remaining = new Set(sockets.map((socket) => socket.inode))
    const result = new Map<string, Pick<ListeningPort, 'name' | 'folder'>>()
    if (!remaining.size) return result
    const pids = await this.list('/proc')
    for (const pid of pids.filter((value) => /^\d+$/u.test(value)).sort()) {
      if (!remaining.size) break
      const owned = new Set<string>()
      const descriptors = await this.list(`/proc/${pid}/fd`)
      for (const descriptor of descriptors) {
        if (!/^\d+$/u.test(descriptor)) continue
        const target = await this.reader
          .link(`/proc/${pid}/fd/${descriptor}`)
          .catch(() => null)
        const inode =
          typeof target === 'string'
            ? /^socket:\[(\d+)\]$/u.exec(target)?.[1]
            : undefined
        if (inode && remaining.has(inode)) owned.add(inode)
      }
      if (!owned.size) continue
      const [command, folder] = await Promise.all([
        this.reader.read(`/proc/${pid}/cmdline`).catch(() => null),
        this.reader.link(`/proc/${pid}/cwd`).catch(() => null),
      ])
      const metadata = {
        name: portName(command),
        folder: portFolder(folder, this.options.home, this.options.cwd),
      }
      for (const inode of owned) {
        result.set(inode, metadata)
        remaining.delete(inode)
      }
    }
    return result
  }

  private async list(path: string): Promise<string[]> {
    const value = await this.reader.list(path).catch(() => [])
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  }
}
