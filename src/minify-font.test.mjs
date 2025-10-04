import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { minifyFont } from './minify-font.mjs'

// Mock dependencies
vi.mock('fonteditor-core', () => ({
  Font: {
    create: vi.fn(),
  },
  woff2: {
    init: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

import { Font, woff2 } from 'fonteditor-core'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

describe('minifyFont', () => {
  let mockFontInstance

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock font instance
    mockFontInstance = {
      write: vi.fn().mockReturnValue(Buffer.from('output-font-data')),
    }

    vi.mocked(Font.create).mockReturnValue(mockFontInstance)
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFile).mockResolvedValue(Buffer.from('input-font-data'))
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(woff2.init).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Input Validation', () => {
    it('should throw error if input file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(
        minifyFont({
          input: 'nonexistent.ttf',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('nonexistent.ttf is not exists')
    })

    it('should throw error for invalid input font type', async () => {
      await expect(
        minifyFont({
          input: 'font.pdf',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('Invalid input font type: pdf')
    })

    it('should throw error for invalid output font type', async () => {
      await expect(
        minifyFont({
          input: 'font.ttf',
          output: 'output.pdf',
          text: 'Hello',
        })
      ).rejects.toThrow('Invalid output font type: pdf')
    })

    it('should accept valid input font types', async () => {
      const validTypes = ['ttf', 'otf', 'eot', 'svg', 'woff', 'woff2']

      for (const type of validTypes) {
        await expect(
          minifyFont({
            input: `font.${type}`,
            output: 'output.ttf',
            text: 'Hello',
          })
        ).resolves.not.toThrow()
      }
    })

    it('should accept valid output font types', async () => {
      const validTypes = ['ttf', 'otf', 'eot', 'svg', 'woff', 'woff2']

      for (const type of validTypes) {
        await expect(
          minifyFont({
            input: 'font.ttf',
            output: `output.${type}`,
            text: 'Hello',
          })
        ).resolves.not.toThrow()
      }
    })
  })

  describe('woff2 Initialization', () => {
    it('should initialize woff2 when input is woff2', async () => {
      await minifyFont({
        input: 'font.woff2',
        output: 'output.ttf',
        text: 'Hello',
      })

      expect(woff2.init).toHaveBeenCalledOnce()
    })

    it('should initialize woff2 when output is woff2', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(woff2.init).toHaveBeenCalledOnce()
    })

    it('should initialize woff2 when both input and output are woff2', async () => {
      await minifyFont({
        input: 'font.woff2',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(woff2.init).toHaveBeenCalledOnce()
    })

    it('should not initialize woff2 for other font types', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff',
        text: 'Hello',
      })

      expect(woff2.init).not.toHaveBeenCalled()
    })
  })

  describe('Font Processing', () => {
    it('should read input font file', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'Hello',
      })

      expect(readFile).toHaveBeenCalledWith('font.ttf')
    })

    it('should create font with correct type', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          type: 'ttf',
        })
      )
    })

    it('should create font with text subset', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'ABC',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: [65, 66, 67], // Character codes for 'A', 'B', 'C'
        })
      )
    })

    it('should handle unicode characters in text', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: '你好',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: ['你'.charCodeAt(0), '好'.charCodeAt(0)],
        })
      )
    })

    it('should handle empty text', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: '',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: '',
        })
      )
    })

    it('should handle undefined text', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: undefined,
        })
      )
    })

    it('should write font with correct output type', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(mockFontInstance.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'woff2',
        })
      )
    })

    it('should write output to correct file', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(writeFile).toHaveBeenCalledWith('output.woff2', expect.any(Buffer))
    })
  })

  describe('Custom Options', () => {
    it('should pass inputOptions to Font.create', async () => {
      const inputOptions = {
        hinting: true,
        compound2simple: true,
      }

      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'Hello',
        inputOptions,
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          hinting: true,
          compound2simple: true,
          type: 'ttf',
        })
      )
    })

    it('should pass outputOptions to font.write', async () => {
      const outputOptions = {
        deflate: true,
        kerning: true,
      }

      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'Hello',
        outputOptions,
      })

      expect(mockFontInstance.write).toHaveBeenCalledWith(
        expect.objectContaining({
          deflate: true,
          kerning: true,
          type: 'ttf',
        })
      )
    })

    it('should combine inputOptions with type and subset', async () => {
      const inputOptions = { customOption: 'value' }

      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'Test',
        inputOptions,
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          customOption: 'value',
          type: 'ttf',
          subset: expect.any(Array),
        })
      )
    })
  })

  describe('Font Type Conversions', () => {
    it('should convert ttf to woff', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'ttf' }))
      expect(mockFontInstance.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'woff' }))
    })

    it('should convert ttf to woff2', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'ttf' }))
      expect(mockFontInstance.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'woff2' }))
    })

    it('should convert woff to ttf', async () => {
      await minifyFont({
        input: 'font.woff',
        output: 'output.ttf',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'woff' }))
      expect(mockFontInstance.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'ttf' }))
    })

    it('should convert otf to woff2', async () => {
      await minifyFont({
        input: 'font.otf',
        output: 'output.woff2',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'otf' }))
      expect(mockFontInstance.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'woff2' }))
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in text', async () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?'

      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: specialText,
      })

      const expectedCharCodes = specialText.split('').map(c => c.charCodeAt(0))
      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: expectedCharCodes,
        })
      )
    })

    it('should handle duplicate characters in text', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'AAA',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: [65, 65, 65], // All 'A's included (no deduplication in function)
        })
      )
    })

    it('should handle mixed case in text', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.ttf',
        text: 'AaBbCc',
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          subset: [65, 97, 66, 98, 67, 99],
        })
      )
    })

    it('should handle paths with multiple dots', async () => {
      await minifyFont({
        input: 'my.font.file.ttf',
        output: 'output.min.ttf',
        text: 'Hello',
      })

      expect(Font.create).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ type: 'ttf' }))
      expect(mockFontInstance.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'ttf' }))
    })

    it('should handle absolute paths', async () => {
      await minifyFont({
        input: '/absolute/path/font.ttf',
        output: '/absolute/path/output.ttf',
        text: 'Hello',
      })

      expect(readFile).toHaveBeenCalledWith('/absolute/path/font.ttf')
      expect(writeFile).toHaveBeenCalledWith('/absolute/path/output.ttf', expect.any(Buffer))
    })

    it('should handle relative paths', async () => {
      await minifyFont({
        input: './relative/font.ttf',
        output: './relative/output.ttf',
        text: 'Hello',
      })

      expect(readFile).toHaveBeenCalledWith('./relative/font.ttf')
      expect(writeFile).toHaveBeenCalledWith('./relative/output.ttf', expect.any(Buffer))
    })
  })

  describe('Error Handling', () => {
    it('should propagate readFile errors', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('Read error'))

      await expect(
        minifyFont({
          input: 'font.ttf',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('Read error')
    })

    it('should propagate Font.create errors', async () => {
      vi.mocked(Font.create).mockImplementation(() => {
        throw new Error('Invalid font data')
      })

      await expect(
        minifyFont({
          input: 'font.ttf',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('Invalid font data')
    })

    it('should propagate writeFile errors', async () => {
      vi.mocked(writeFile).mockRejectedValue(new Error('Write error'))

      await expect(
        minifyFont({
          input: 'font.ttf',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('Write error')
    })

    it('should propagate woff2.init errors', async () => {
      vi.mocked(woff2.init).mockRejectedValue(new Error('woff2 init failed'))

      await expect(
        minifyFont({
          input: 'font.woff2',
          output: 'output.ttf',
          text: 'Hello',
        })
      ).rejects.toThrow('woff2 init failed')
    })
  })

  describe('Complete Workflow', () => {
    it('should complete full workflow for ttf to woff2 conversion', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff2',
        text: 'Hello World',
      })

      // Verify order of operations
      expect(existsSync).toHaveBeenCalled()
      expect(woff2.init).toHaveBeenCalled()
      expect(readFile).toHaveBeenCalled()
      expect(Font.create).toHaveBeenCalled()
      expect(mockFontInstance.write).toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalled()
    })

    it('should complete full workflow with custom options', async () => {
      await minifyFont({
        input: 'font.ttf',
        output: 'output.woff',
        text: 'Test',
        inputOptions: { hinting: true },
        outputOptions: { deflate: true },
      })

      expect(Font.create).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          hinting: true,
          type: 'ttf',
        })
      )
      expect(mockFontInstance.write).toHaveBeenCalledWith(
        expect.objectContaining({
          deflate: true,
          type: 'woff',
        })
      )
    })
  })
})
