// Computes the next semver (https://semver.org) and writes it to package.json.
// Usage: node scripts/bump-version.mjs <major|minor|patch>
// Prints the new version to stdout.
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../package.json', import.meta.url)
const level = process.argv[2]
const parts = { major: 0, minor: 1, patch: 2 }

if (!(level in parts)) {
  console.error('Usage: node scripts/bump-version.mjs <major|minor|patch>')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(file, 'utf8'))
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version)
if (!match) {
  console.error(`package.json version "${pkg.version}" is not MAJOR.MINOR.PATCH`)
  process.exit(1)
}

const next = match.slice(1).map(Number)
next[parts[level]] += 1
for (let i = parts[level] + 1; i < 3; i++) next[i] = 0

pkg.version = next.join('.')
writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(pkg.version)
