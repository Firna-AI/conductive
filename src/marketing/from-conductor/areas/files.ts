import type { ParityFeature } from '../model'

export const filesFeatures: readonly ParityFeature[] = [
  {
    id: 'file-tree',
    area: 'files',
    name: 'File tree',
    status: 'available',
    note: 'All files shows the repository tree and marks added or changed files.',
  },
  {
    id: 'quick-open',
    area: 'files',
    name: 'Quick open',
    status: 'considering',
    note: 'Quick open by file name is under consideration.',
  },
  {
    id: 'search-across-files',
    area: 'files',
    name: 'Search across files',
    status: 'considering',
    note: 'Search across file contents is under consideration. Use the agent or terminal to search today.',
  },
  {
    id: 'file-tabs-and-editor',
    area: 'files',
    name: 'File tabs and editor',
    status: 'different',
    note: 'Files open in tabs with line numbers and syntax colours. A click opens a temporary tab, and a double-click keeps it. Editing and file search are under consideration.',
  },
  {
    id: 'markdown-and-html-previews',
    area: 'files',
    name: 'Markdown and HTML previews',
    status: 'different',
    note: 'Markdown files have rendered and source views. HTML and SVG open as source.',
  },
  {
    id: 'image-previews',
    area: 'files',
    name: 'Image previews',
    status: 'in-progress',
    note: 'Image previews in file tabs are in progress. Previews in sent messages are planned.',
    due: null,
  },
  {
    id: 'media-and-data-previews',
    area: 'files',
    name: 'Media and data previews',
    status: 'considering',
    note: 'Audio and video previews, CSV tables, and JSON trees are under consideration. Text files open as source.',
  },
  {
    id: 'artifacts-tab',
    area: 'files',
    name: 'Artifacts tab',
    status: 'considering',
    note: 'A separate Artifacts tab is under consideration.',
  },
  {
    id: 'open-and-download-files',
    area: 'files',
    name: 'Open and download files',
    status: 'available',
    note: 'Copy or download a text file from its file tab. The file size limit is 5 MiB.',
  },
]
