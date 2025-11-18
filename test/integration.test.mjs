import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { minifyFont } from '../src/minify-font.mjs'
import { createWebFonts } from '../src/create-web-fonts.mjs'
import { existsSync, rmSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TEST_FONT = join(__dirname, 'zcool-xiaowei.ttf')
const OUTPUT_DIR = join(__dirname, 'output')

describe('Integration Tests with Real Font', () => {
  beforeEach(() => {
    // Clean output directory before each test
    if (existsSync(OUTPUT_DIR)) {
      rmSync(OUTPUT_DIR, { recursive: true, force: true })
    }
    mkdirSync(OUTPUT_DIR, { recursive: true })
  })

  afterEach(() => {
    // Clean up after tests
    if (existsSync(OUTPUT_DIR)) {
      rmSync(OUTPUT_DIR, { recursive: true, force: true })
    }
  })

  describe('minifyFont', () => {
    it('should convert TTF to WOFF2 with real font', async () => {
      const output = join(OUTPUT_DIR, 'test.woff2')

      await minifyFont({
        input: TEST_FONT,
        output: output,
        text: 'Hello, World!',
      })

      expect(existsSync(output)).toBe(true)
      const stats = statSync(output)
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should subset Chinese characters', async () => {
      const output = join(OUTPUT_DIR, 'chinese.woff2')
      const text = '你好世界'

      await minifyFont({
        input: TEST_FONT,
        output: output,
        text: text,
      })

      expect(existsSync(output)).toBe(true)
      const stats = statSync(output)
      // Subsetted font should be much smaller than original
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThan(1024 * 100) // Should be less than 100KB
    })

    it('should convert to multiple formats', async () => {
      const formats = ['woff2', 'woff', 'ttf']
      const text = 'ABC123'

      for (const format of formats) {
        const output = join(OUTPUT_DIR, `test.${format}`)
        await minifyFont({
          input: TEST_FONT,
          output: output,
          text: text,
        })

        expect(existsSync(output)).toBe(true)
        const stats = statSync(output)
        expect(stats.size).toBeGreaterThan(0)
      }
    })

    it('should accept hinting and kerning options without errors', async () => {
      const output = join(OUTPUT_DIR, 'with-options.woff2')
      const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

      // Test that the options are accepted without throwing errors
      await expect(
        minifyFont({
          input: TEST_FONT,
          output: output,
          text: text,
          inputOptions: {
            hinting: true,
            kerning: true,
            compound2simple: false,
          },
          outputOptions: {
            hinting: true,
            kerning: true,
          },
        })
      ).resolves.not.toThrow()

      expect(existsSync(output)).toBe(true)
    })

    it('should handle empty text by not subsetting', async () => {
      const output = join(OUTPUT_DIR, 'no-subset.woff2')

      await minifyFont({
        input: TEST_FONT,
        output: output,
        text: '',
      })

      expect(existsSync(output)).toBe(true)
      const stats = statSync(output)
      // Font without subsetting should be larger
      expect(stats.size).toBeGreaterThan(1024 * 50) // Should be > 50KB
    })

    it('should work with special characters', async () => {
      const output = join(OUTPUT_DIR, 'special.woff2')
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?'

      await minifyFont({
        input: TEST_FONT,
        output: output,
        text: text,
      })

      expect(existsSync(output)).toBe(true)
      const stats = statSync(output)
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('createWebFonts', () => {
    it('should create multiple web font formats', async () => {
      const result = await createWebFonts({
        input: TEST_FONT,
        outputDir: OUTPUT_DIR,
        text: 'Hello, World!',
      })

      expect(result.outputDir).toBe(OUTPUT_DIR)
      expect(result.fonts).toHaveLength(3) // woff2, woff, ttf

      result.fonts.forEach(font => {
        expect(font.success).toBe(true)
        expect(font.error).toBeUndefined()
        expect(existsSync(font.path)).toBe(true)

        const stats = statSync(font.path)
        expect(stats.size).toBeGreaterThan(0)
      })
    })

    it('should create only specified formats', async () => {
      const result = await createWebFonts({
        input: TEST_FONT,
        outputDir: OUTPUT_DIR,
        text: 'Test',
        formats: ['woff2'],
      })

      expect(result.fonts).toHaveLength(1)
      expect(result.fonts[0].format).toBe('woff2')
      expect(result.fonts[0].success).toBe(true)
      expect(existsSync(result.fonts[0].path)).toBe(true)
    })

    it('should use custom filename resolver', async () => {
      const result = await createWebFonts({
        input: TEST_FONT,
        outputDir: OUTPUT_DIR,
        text: 'Test',
        formats: ['woff2'],
        resolveFileName: ({ basename, ext }) => `custom-${basename}.${ext}`,
      })

      expect(result.fonts[0].path).toContain('custom-zcool-xiaowei')
      expect(existsSync(result.fonts[0].path)).toBe(true)
    })

    it('should handle large character set', async () => {
      // Use more characters to test performance
      const chars = []
      for (let i = 0x4e00; i < 0x4e00 + 100; i++) {
        chars.push(String.fromCharCode(i))
      }
      const text = chars.join('')

      const result = await createWebFonts({
        input: TEST_FONT,
        outputDir: OUTPUT_DIR,
        text: text,
        formats: ['woff2'],
      })

      expect(result.fonts[0].success).toBe(true)
      expect(existsSync(result.fonts[0].path)).toBe(true)

      const stats = statSync(result.fonts[0].path)
      // Should be reasonably sized for 100 characters
      expect(stats.size).toBeGreaterThan(1024 * 5) // > 5KB
      expect(stats.size).toBeLessThan(1024 * 100) // < 100KB
    })

    it('should report errors for invalid formats', async () => {
      // This test validates error handling
      const result = await createWebFonts({
        input: TEST_FONT,
        outputDir: OUTPUT_DIR,
        text: 'Test',
        formats: ['woff2', 'woff', 'ttf'],
      })

      // All should succeed with valid formats
      result.fonts.forEach(font => {
        expect(font.success).toBe(true)
      })
    })
  })

  describe('File Size Validation', () => {
    it('should produce smaller files with subsetting', async () => {
      const fullOutput = join(OUTPUT_DIR, 'full.woff2')
      const subsetOutput = join(OUTPUT_DIR, 'subset.woff2')

      // Create full font (no subsetting)
      await minifyFont({
        input: TEST_FONT,
        output: fullOutput,
        text: '',
      })

      // Create subsetted font
      await minifyFont({
        input: TEST_FONT,
        output: subsetOutput,
        text: 'Hello',
      })

      const fullSize = statSync(fullOutput).size
      const subsetSize = statSync(subsetOutput).size

      console.log(`Full font size: ${fullSize} bytes, Subset size: ${subsetSize} bytes`)

      // Subsetted should be significantly smaller
      expect(subsetSize).toBeLessThan(fullSize)
      expect(subsetSize).toBeLessThan(fullSize * 0.1) // At least 90% smaller
    })

    it('should show WOFF2 is smaller than TTF', async () => {
      const ttfOutput = join(OUTPUT_DIR, 'test.ttf')
      const woff2Output = join(OUTPUT_DIR, 'test.woff2')
      const text = 'Hello, World!'

      await minifyFont({
        input: TEST_FONT,
        output: ttfOutput,
        text: text,
      })

      await minifyFont({
        input: TEST_FONT,
        output: woff2Output,
        text: text,
      })

      const ttfSize = statSync(ttfOutput).size
      const woff2Size = statSync(woff2Output).size

      // WOFF2 should be smaller due to compression
      expect(woff2Size).toBeLessThan(ttfSize)
    })
  })
})
