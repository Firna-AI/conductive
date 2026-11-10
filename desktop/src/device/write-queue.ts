import { DEVICE_FRAME_LIMIT_BYTES } from '../../../src/shared/device.ts'
import type { DeviceToWorker } from '../../../src/shared/device.ts'
import type { ImportFrameSend } from '../import/types.ts'
import { deviceFrame } from './frame.js'

interface Dependencies {
  open(): boolean
  buffered(): number
  write(frame: string, callback: (error?: Error) => void): void
  fail(): void
}
interface ImportWrite {
  frame: string
  signal: AbortSignal
  finish(sent: boolean): void
}

/** A single import write never consumes the native device queue's allowance. */
export function createDeviceWrites(dependencies: Dependencies) {
  const native: string[] = []
  const imports: ImportWrite[] = []
  let nativeBytes = 0
  let pending = 0
  let importWriting = false
  let flushing = false
  let closed = false
  const fail = () => {
    dependencies.fail()
    return false
  }
  const write = (frame: string, importer: boolean): boolean => {
    pending++
    if (importer) importWriting = true
    try {
      dependencies.write(frame, (error) => {
        pending--
        if (importer) importWriting = false
        if (error) fail()
        else flush()
      })
      return true
    } catch {
      pending--
      if (importer) importWriting = false
      return fail()
    }
  }
  const flush = () => {
    if (closed || flushing || !dependencies.open()) return
    flushing = true
    try {
      if (importWriting) return
      while (native.length) {
        const frame = native.shift()
        if (frame === undefined) break
        const size = Buffer.byteLength(frame)
        nativeBytes -= size
        if (
          dependencies.buffered() + size > DEVICE_FRAME_LIMIT_BYTES ||
          !write(frame, false)
        ) {
          fail()
          return
        }
      }
      if (pending || dependencies.buffered()) return
      const task = imports.shift()
      if (!task) return
      task.finish(!task.signal.aborted && write(task.frame, true))
    } finally {
      flushing = false
      if (
        !closed &&
        !pending &&
        !dependencies.buffered() &&
        (native.length || imports.length)
      )
        queueMicrotask(flush)
    }
  }
  const encode = (message: DeviceToWorker) => {
    const frame = deviceFrame(message)
    if (
      closed ||
      !dependencies.open() ||
      frame === undefined ||
      Buffer.byteLength(frame) > DEVICE_FRAME_LIMIT_BYTES
    ) {
      fail()
      return
    }
    return frame
  }
  const sendImport: ImportFrameSend = (message, signal) =>
    new Promise((resolve) => {
      const frame = encode(message)
      if (frame === undefined || signal.aborted) {
        resolve(false)
        return
      }
      const cancelled = () => {
        const index = imports.indexOf(task)
        if (index >= 0) imports.splice(index, 1)
        task.finish(false)
      }
      const task: ImportWrite = {
        frame,
        signal,
        finish(sent) {
          signal.removeEventListener('abort', cancelled)
          resolve(sent)
        },
      }
      signal.addEventListener('abort', cancelled, { once: true })
      imports.push(task)
      flush()
    })
  return {
    send(message: DeviceToWorker): boolean {
      const frame = encode(message)
      if (frame === undefined) return false
      const size = Buffer.byteLength(frame)
      if (importWriting) {
        if (nativeBytes + size > DEVICE_FRAME_LIMIT_BYTES) return fail()
        native.push(frame)
        nativeBytes += size
        return true
      }
      if (dependencies.buffered() + size > DEVICE_FRAME_LIMIT_BYTES)
        return fail()
      return write(frame, false)
    },
    sendImport,
    close() {
      closed = true
      native.length = 0
      nativeBytes = 0
      for (const task of imports.splice(0)) task.finish(false)
    },
  }
}
