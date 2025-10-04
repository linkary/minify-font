import fs from 'node:fs'

/**
 * Ensures the given directory exists
 * @param {string} dir - The directory path to check/create
 */
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
