import { mkdir, writeFile } from 'node:fs/promises'

const serverDir = new URL('../dist/server/', import.meta.url)
const workerEntry = new URL('./index.js', serverDir)

await mkdir(serverDir, { recursive: true })
await writeFile(workerEntry, `export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
`)
