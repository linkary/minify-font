import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, rmSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('CLI Character Mode Tests', () => {
  const testFontPath = resolve(__dirname, '../test/zcool-xiaowei.ttf')
  const outputDir = resolve(__dirname, '../test/cli-output')

  beforeEach(() => {
    // Clean up output directory before each test
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
    mkdirSync(outputDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up after tests
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
  })

  describe('Specified Mode (only -w, no -c)', () => {
    it('should use only specified words when -w is provided alone', () => {
      const outputPath = resolve(outputDir, 'specified.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "ABC" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using specified words only: 3 unique chars')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should handle Unicode characters in specified mode', () => {
      const outputPath = resolve(outputDir, 'unicode.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "你好世界" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using specified words only: 4 unique chars')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should create smaller file in specified mode vs default collection', () => {
      const specifiedPath = resolve(outputDir, 'specified-small.ttf')
      const defaultPath = resolve(outputDir, 'default-large.ttf')

      // Generate with specified words only
      execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "Hello" -f ttf -o "${specifiedPath}"`,
        { encoding: 'utf8' }
      )

      // Generate with default collection
      execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -f ttf -o "${defaultPath}"`,
        { encoding: 'utf8' }
      )

      const specifiedSize = readFileSync(specifiedPath).length
      const defaultSize = readFileSync(defaultPath).length

      // Specified mode should create much smaller file
      expect(specifiedSize).toBeLessThan(defaultSize)
      expect(specifiedSize).toBeLessThan(20000) // Should be very small
    })
  })

  describe('Append Mode (-c + -w)', () => {
    it('should combine collection and custom words when both are provided', () => {
      const outputPath = resolve(outputDir, 'combined.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c top500 -w "额外字符" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using collection "top500"')
      expect(output).toContain('+ custom words')
      expect(output).toContain('Total:')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should deduplicate characters when combining', () => {
      const outputPath = resolve(outputDir, 'deduped.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c top500 -w "一二三" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      // Should show total unique chars (top500 already contains 一二三)
      expect(output).toContain('Total:')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should create larger file in append mode vs specified mode', () => {
      const appendPath = resolve(outputDir, 'append-large.ttf')
      const specifiedPath = resolve(outputDir, 'specified-small.ttf')

      // Append mode: collection + words
      execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c top500 -w "ABC" -f ttf -o "${appendPath}"`,
        { encoding: 'utf8' }
      )

      // Specified mode: only words
      execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "ABC" -f ttf -o "${specifiedPath}"`,
        { encoding: 'utf8' }
      )

      const appendSize = readFileSync(appendPath).length
      const specifiedSize = readFileSync(specifiedPath).length

      // Append mode should create much larger file
      expect(appendSize).toBeGreaterThan(specifiedSize)
      expect(appendSize).toBeGreaterThan(100000) // Should include full top500
    })
  })

  describe('Collection Only Mode (-c only)', () => {
    it('should use only collection when -c is provided without -w', () => {
      const outputPath = resolve(outputDir, 'collection-only.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c top500 -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using character collection: top500')
      expect(output).not.toContain('custom words')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should support different collection types', () => {
      const collections = ['top500', 'top2500', 'commonlyUsed']

      for (const collection of collections) {
        const outputPath = resolve(outputDir, `${collection}.ttf`)

        const output = execSync(
          `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c ${collection} -f ttf -o "${outputPath}"`,
          { encoding: 'utf8' }
        )

        expect(output).toContain(`Using character collection: ${collection}`)
        expect(existsSync(outputPath)).toBe(true)
      }
    })
  })

  describe('Default Mode (no -c, no -w)', () => {
    it('should use default collection (top2500) when no options provided', () => {
      const outputPath = resolve(outputDir, 'default.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using character collection: top2500')
      expect(existsSync(outputPath)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string in specified mode', () => {
      const outputPath = resolve(outputDir, 'empty.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using specified words only: 0 unique chars')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should handle special characters in specified mode', () => {
      const outputPath = resolve(outputDir, 'special.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "!@#$%^&*()" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      expect(output).toContain('Using specified words only:')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should deduplicate characters in specified mode', () => {
      const outputPath = resolve(outputDir, 'deduped.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -w "AAABBBCCC" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      // "AAABBBCCC" has 9 characters but only 3 unique (A, B, C)
      expect(output).toContain('Using specified words only: 3 unique chars')
      expect(existsSync(outputPath)).toBe(true)
    })

    it('should deduplicate characters when combining with collection', () => {
      const outputPath = resolve(outputDir, 'deduped-combo.ttf')

      const output = execSync(
        `node ${resolve(__dirname, 'minify-font.mjs')} "${testFontPath}" -c top500 -w "AAA一一一" -f ttf -o "${outputPath}"`,
        { encoding: 'utf8' }
      )

      // Should show collection + custom words with deduplication
      expect(output).toContain('+ custom words')
      expect(output).toContain('Total:')
      expect(existsSync(outputPath)).toBe(true)
    })
  })
})

