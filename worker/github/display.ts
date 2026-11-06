import { isRecord } from '../http'
import type { GitHubSnapshot } from './contracts'

function equalValues(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => equalValues(value, right[index]))
    )
  if (!isRecord(left) || !isRecord(right)) return false
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equalValues(left[key], right[key]),
    )
  )
}

export function sameDisplay(
  left: GitHubSnapshot,
  right: GitHubSnapshot,
): boolean {
  return equalValues(
    { banner: { ...left.banner, updatedAt: 0 }, checks: left.checks },
    { banner: { ...right.banner, updatedAt: 0 }, checks: right.checks },
  )
}
