import Snippets from './snippets.json'
import Fuse from 'fuse.js'

type SnippetItem = {
  command: `s/${string}`
  template: string
}

const snippets = Snippets as SnippetItem[]

const snippetDb = new Fuse(snippets, {
  keys: ['command'],
  includeScore: true,
  minMatchCharLength: 4,
  location: 1,
})

export { snippetDb }
