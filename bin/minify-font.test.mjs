import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { minifyFont } from '../src/minify-font.mjs'
import { mkdir } from 'node:fs/promises'

// Mock dependencies
vi.mock('../src/minify-font.mjs')
vi.mock('node:fs/promises')

describe('minify-font CLI', () => {
  let originalArgv
  let originalExit
  let consoleLogSpy
  let consoleErrorSpy
  let runCLI

  beforeEach(async () => {
    // Save original values
    originalArgv = process.argv
    originalExit = process.exit

    // Mock process.exit
    process.exit = vi.fn()

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock mkdir
    vi.mocked(mkdir).mockResolvedValue(undefined)

    // Mock minifyFont
    vi.mocked(minifyFont).mockResolvedValue(undefined)

    // Clear module cache and re-import to get fresh instance
    vi.resetModules()
    const module = await import('./minify-font.mjs')
    runCLI = module.runCLI
  })

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv
    process.exit = originalExit
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('Help and Version', () => {
    it('should show help when no arguments provided', async () => {
      process.argv = ['node', 'minify-font.mjs']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: minify-font'))
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should show help with -h flag', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-h']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: minify-font'))
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should show help with --help flag', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--help']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: minify-font'))
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should show version with -v flag', async () => {
      process.argv = ['node', 'minify-font.mjs', '-v']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('version'))
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should show version with --version flag', async () => {
      process.argv = ['node', 'minify-font.mjs', '--version']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('version'))
      expect(process.exit).toHaveBeenCalledWith(0)
    })
  })

  describe('Collection Selection', () => {
    it('should use default top2500 collection', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using character collection: top2500')
      )
      expect(minifyFont).toHaveBeenCalled()
    })

    it('should use top500 collection with -c flag', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-c', 'top500']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using character collection: top500')
      )
    })

    it('should use commonlyUsed collection with --collection flag', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--collection', 'commonlyUsed']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using character collection: commonlyUsed')
      )
    })

    it('should use commonlyUsed collection', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-c', 'commonlyUsed']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using character collection: commonlyUsed')
      )
    })

    it('should error on invalid collection name', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-c', 'invalid']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid collection "invalid"'))
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('Custom Words', () => {
    it('should use custom words with -w flag', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-w', 'Hello World']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Using specified words only'))
    })

    it('should combine collection with custom words', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-c', 'top500', '-w', '额外字符']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using collection "top500"')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+ custom words'))
    })
  })

  describe('Output Options', () => {
    it('should generate default formats (ttf, woff, woff2)', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledTimes(3)
      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'font.ttf',
          output: expect.stringContaining('.min.ttf'),
        })
      )
      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'font.ttf',
          output: expect.stringContaining('.min.woff'),
        })
      )
      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'font.ttf',
          output: expect.stringContaining('.min.woff2'),
        })
      )
    })

    it('should use specified output directory', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-o', 'output/']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.stringContaining('output/'),
        })
      )
    })

    it('should use specific output file', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-o', 'custom.woff2']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          output: 'custom.woff2',
        })
      )
    })

    it('should generate only specified formats', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-f', 'woff2']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledTimes(1)
      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.stringContaining('.woff2'),
        })
      )
    })

    it('should generate multiple specified formats', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-f', 'ttf,woff']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledTimes(2)
    })

    it('should create output directories', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-o', 'dist/fonts/']
      await runCLI()

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('dist/fonts'), {
        recursive: true,
      })
    })
  })

  describe('Font Options', () => {
    it('should accept input options as JSON', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--input-options', '{"type":"ttf"}']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          inputOptions: { type: 'ttf' },
        })
      )
    })

    it('should accept output options as JSON', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--output-options', '{"hinting":true}']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          outputOptions: { hinting: true },
        })
      )
    })

    it('should error on invalid input options JSON', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--input-options', 'invalid-json']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON for --input-options'),
        expect.any(String)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should error on invalid output options JSON', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--output-options', 'invalid-json']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON for --output-options'),
        expect.any(String)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('Error Handling', () => {
    it('should error when input file is missing', async () => {
      process.argv = ['node', 'minify-font.mjs', '-o', 'output.woff2']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Input font path is required'))
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should error on unknown option', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '--unknown']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown option'))
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should error on multiple input files', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font1.ttf', 'font2.ttf']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple input files not supported')
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should handle minifyFont errors', async () => {
      vi.mocked(minifyFont).mockRejectedValue(new Error('Font processing failed'))
      process.argv = ['node', 'minify-font.mjs', 'font.ttf']
      await runCLI()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error minifying font'),
        expect.stringContaining('Font processing failed')
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('@font-face CSS Generation', () => {
    it('should output @font-face CSS', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('@font-face'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('font-family'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('src:'))
    })

    it('should use correct format names in CSS', async () => {
      process.argv = ['node', 'minify-font.mjs', 'font.ttf', '-f', 'ttf']
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("format('truetype')"))
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle all options together', async () => {
      process.argv = [
        'node',
        'minify-font.mjs',
        'input.ttf',
        '-c',
        'commonlyUsed',
        '-w',
        'ABC',
        '-o',
        'dist/',
        '-f',
        'woff2,woff',
        '--input-options',
        '{}',
        '--output-options',
        '{}',
      ]
      await runCLI()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using collection "commonlyUsed"')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+ custom words'))
      expect(minifyFont).toHaveBeenCalledTimes(2)
    })

    it('should preserve input filename in output', async () => {
      process.argv = ['node', 'minify-font.mjs', 'my-custom-font.ttf', '-o', 'output/']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.stringContaining('my-custom-font.min'),
        })
      )
    })

    it('should handle paths with directories in input', async () => {
      process.argv = ['node', 'minify-font.mjs', 'fonts/source/font.ttf']
      await runCLI()

      expect(minifyFont).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'fonts/source/font.ttf',
          output: expect.stringMatching(/fonts\/source\/font\.min\./),
        })
      )
    })
  })
})
