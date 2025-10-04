import { createWebFonts } from '../src/create-web-fonts.mjs'
import { TOP_USED_500_CHARS } from 'top-used-chars'
import { rmSync } from 'node:fs'
import { describe, it, expect, afterEach } from 'vitest'

describe('createWebFonts', () => {
  afterEach(() => {
    rmSync('./test/output', { recursive: true, force: true })
  })
  it('should create web fonts', async () => {
    const result = await createWebFonts({
      input: './test/zcool-xiaowei.ttf',
      outputDir: './test/output',
      text: TOP_USED_500_CHARS,
      formats: ['woff2', 'woff', 'ttf'],
    })
    expect(result.outputDir).toBe('./test/output')
    expect(result.fonts).toHaveLength(3)
    const woff2Font = result.fonts.find(font => font.format === 'woff2')
    expect(woff2Font).toBeDefined()
    expect(woff2Font.success).toBe(true)
    expect(woff2Font.path.includes('./test/output/zcool-xiaowei.woff2')).toBe(true)
    const woffFont = result.fonts.find(font => font.format === 'woff')
    expect(woffFont).toBeDefined()
    expect(woffFont.success).toBe(true)
    expect(woffFont.path.includes('./test/output/zcool-xiaowei.woff')).toBe(true)
    const ttfFont = result.fonts.find(font => font.format === 'ttf')
    expect(ttfFont).toBeDefined()
    expect(ttfFont.success).toBe(true)
    expect(ttfFont.path.includes('./test/output/zcool-xiaowei.ttf')).toBe(true)
  })
})
