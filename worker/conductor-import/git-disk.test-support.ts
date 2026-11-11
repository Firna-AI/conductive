import { SNAPSHOT } from './manifest.test-support'

const facts = SNAPSHOT.gitDisk

export const invalidGitDiskSnapshots = [
  { name: 'missing facts', value: { ...SNAPSHOT, gitDisk: undefined } },
  {
    name: 'unknown version',
    value: { ...SNAPSHOT, gitDisk: { ...facts, version: 2 } },
  },
  {
    name: 'wrong tree object format',
    value: { ...SNAPSHOT, objectFormat: 'sha256', headOid: 'a'.repeat(64) },
  },
  {
    name: 'negative count',
    value: {
      ...SNAPSHOT,
      gitDisk: { ...facts, checkout: { ...facts.checkout, fileCount: -1 } },
    },
  },
  {
    name: 'fractional count',
    value: {
      ...SNAPSHOT,
      gitDisk: {
        ...facts,
        checkout: { ...facts.checkout, directoryCount: 0.5 },
      },
    },
  },
  {
    name: 'unsafe byte representation',
    value: {
      ...SNAPSHOT,
      gitDisk: {
        ...facts,
        reconstruction: {
          ...facts.reconstruction,
          inflatedBytes: Number.MAX_SAFE_INTEGER + 1,
        },
      },
    },
  },
  {
    name: 'impossible object envelope',
    value: {
      ...SNAPSHOT,
      gitDisk: {
        ...facts,
        reconstruction: {
          objectCount: 2,
          inflatedBytes: 100,
          maxObjectBytes: 40,
        },
      },
    },
  },
  {
    name: 'nonzero reconstruction without bundle',
    value: { ...SNAPSHOT, bundleObjectId: null },
  },
  {
    name: 'too few pathname bytes',
    value: {
      ...SNAPSHOT,
      gitDisk: { ...facts, checkout: { ...facts.checkout, pathBytes: 5 } },
    },
  },
  {
    name: 'path count sum beyond safe byte total',
    value: {
      ...SNAPSHOT,
      gitDisk: {
        ...facts,
        checkout: {
          ...facts.checkout,
          fileCount: Number.MAX_SAFE_INTEGER,
          pathBytes: Number.MAX_SAFE_INTEGER,
        },
      },
    },
  },
  {
    name: 'too many distinct LFS objects',
    value: {
      ...SNAPSHOT,
      gitDisk: { ...facts, lfs: { ...facts.lfs, cacheObjectCount: 3 } },
    },
  },
  {
    name: 'too many LFS checkout paths',
    value: {
      ...SNAPSHOT,
      gitDisk: {
        ...facts,
        lfs: { ...facts.lfs, checkoutPathCount: 4, checkoutBytes: 32768 },
      },
    },
  },
  {
    name: 'wrong repeated LFS payload bytes',
    value: {
      ...SNAPSHOT,
      gitDisk: { ...facts, lfs: { ...facts.lfs, checkoutBytes: 8192 } },
    },
  },
]
