#!/usr/bin/env node

import { minifyFont } from '../src/minify-font.mjs'
import { extname, dirname } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { TOP_USED_500_CHARS, TOP_USED_2500_CHARS, COMMONLY_USED_CHARS } from 'top-used-chars'

// Character collection mapping
const COLLECTIONS = {
  top500: TOP_USED_500_CHARS,
  top2500: TOP_USED_2500_CHARS,
  commonlyUsed: COMMONLY_USED_CHARS,
}

async function runCLI() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: minify-font <input-font-path> [options]')
    console.log('')
    console.log('Options:')
    console.log('  -c, --collection <name>   Use predefined character collection:')
    console.log('                            top500, top2500 (default), commonlyUsed')
    console.log('  -w, --words <words>       Custom characters to include (can combine with -c)')
    console.log(
      '  -o, --output <output>     Output file or directory (default: same as input with .min suffix)'
    )
    console.log('  -f, --formats <formats>   Comma-separated formats to generate (default: ttf,woff,woff2)')
    console.log('  --input-options <json>    Input font options as JSON string')
    console.log('  --output-options <json>   Output font options as JSON string')
    console.log('  -h, --help                Show this help message')
    console.log('  -v, --version             Show version')
    console.log('')
    console.log('Examples:')
    console.log('  minify-font font.ttf')
    console.log('  minify-font font.ttf -c top500')
    console.log('  minify-font font.ttf -c commonlyUsed -o output/')
    console.log('  minify-font font.ttf -w "Hello World"')
    console.log('  minify-font font.ttf -c top1000 -w "额外字符" -o minified.woff2')
    console.log('  minify-font font.ttf -f woff2')
    console.log('  minify-font font.ttf -f ttf,woff -o dist/')
    process.exit(0)
  }

  let input = null
  let words = null
  let collection = 'top2500' // default collection
  let output = null
  let formats = null
  let inputOptions = {}
  let outputOptions = {}

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '-h':
      case '--help':
        console.log('Usage: minify-font <input-font-path> [options]')
        console.log('')
        console.log('Options:')
        console.log('  -c, --collection <name>   Use predefined character collection:')
        console.log('                            top500, top2500 (default), commonlyUsed')
        console.log('  -w, --words <words>       Custom characters to include (can combine with -c)')
        console.log(
          '  -o, --output <output>     Output file or directory (default: same as input with .min suffix)'
        )
        console.log(
          '  -f, --formats <formats>   Comma-separated formats to generate (default: ttf,woff,woff2)'
        )
        console.log('  --input-options <json>    Input font options as JSON string')
        console.log('  --output-options <json>   Output font options as JSON string')
        console.log('  -h, --help                Show this help message')
        console.log('  -v, --version             Show version')
        console.log('')
        console.log('Examples:')
        console.log('  minify-font font.ttf')
        console.log('  minify-font font.ttf -c top500')
        console.log('  minify-font font.ttf -c commonlyUsed -o output/')
        console.log('  minify-font font.ttf -w "Hello World"')
        console.log('  minify-font font.ttf -c top1000 -w "额外字符" -o minified.woff2')
        console.log('  minify-font font.ttf -f woff2')
        console.log('  minify-font font.ttf -f ttf,woff -o dist/')
        process.exit(0)

      case '-v':
      case '--version':
        console.log('minify-font version 1.0.0')
        process.exit(0)

      case '-c':
      case '--collection':
        collection = args[++i]
        if (!COLLECTIONS[collection]) {
          console.error(
            `Error: Invalid collection "${collection}". Available: ${Object.keys(COLLECTIONS).join(', ')}`
          )
          process.exit(1)
        }
        break

      case '-w':
      case '--words':
        words = args[++i]
        break

      case '-o':
      case '--output':
        output = args[++i]
        break

      case '-f':
      case '--formats':
        formats = args[++i]
        break

      case '--input-options':
        try {
          inputOptions = JSON.parse(args[++i])
        } catch (e) {
          console.error('Invalid JSON for --input-options:', e.message)
          process.exit(1)
        }
        break

      case '--output-options':
        try {
          outputOptions = JSON.parse(args[++i])
        } catch (e) {
          console.error('Invalid JSON for --output-options:', e.message)
          process.exit(1)
        }
        break

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
        if (!input) {
          input = arg
        } else {
          console.error('Multiple input files not supported')
          process.exit(1)
        }
        break
    }
  }

  if (!input) {
    console.error('Error: Input font path is required')
    process.exit(1)
  }

  try {
    console.log(`\nProcessing: ${input}`)

    // Get characters to include
    let text = COLLECTIONS[collection] || TOP_USED_2500_CHARS

    console.log(`Using character collection: ${collection} (${text.length} chars)`)

    // If custom words provided, combine with collection
    if (words) {
      // Combine and deduplicate characters
      const combinedChars = new Set([...text, ...words])
      text = Array.from(combinedChars).join('')
      console.log(`Added custom words, total: ${text.length} unique chars`)
    }

    // Determine formats to generate
    let outputFormats = []
    const hasOutputExtension = output && extname(output)

    if (formats) {
      // User specified formats explicitly
      outputFormats = formats.split(',').map(f => f.trim())
    } else if (hasOutputExtension) {
      // User specified a specific output file with extension
      outputFormats = [extname(output).slice(1)]
    } else {
      // Default: generate ttf, woff, woff2
      outputFormats = ['ttf', 'woff', 'woff2']
    }

    // Generate output paths for each format
    const outputPaths = []
    const inputBaseName = input.replace(/\.[^/.]+$/, '')
    const inputFileName = input.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '')

    for (const format of outputFormats) {
      let outputPath

      if (hasOutputExtension) {
        // User specified a specific file, replace extension with current format
        outputPath = output.replace(/\.[^/.]+$/, `.${format}`)
      } else if (output) {
        // Output is a directory
        outputPath = `${output}/${inputFileName}.min.${format}`
      } else {
        // No output specified, use input location with .min suffix
        outputPath = `${inputBaseName}.min.${format}`
      }

      outputPaths.push(outputPath)
    }

    // Ensure output directory exists for all files
    for (const outputPath of outputPaths) {
      const outputDir = dirname(outputPath)
      await mkdir(outputDir, { recursive: true })
    }

    // Generate all formats
    console.log(`\nGenerating ${outputFormats.length} format(s): ${outputFormats.join(', ')}`)
    const generatedFiles = []
    for (let i = 0; i < outputFormats.length; i++) {
      const format = outputFormats[i]
      const outputPath = outputPaths[i]

      process.stdout.write(`  ${format}... `)
      await minifyFont({
        input,
        output: outputPath,
        text,
        inputOptions,
        outputOptions,
      })
      console.log('✓')

      generatedFiles.push(outputPath)
    }

    // Output all generated file paths
    console.log('\n✓ Generated successfully:')
    generatedFiles.forEach(file => console.log(`  ${file}`))

    // Generate @font-face CSS with correct syntax
    const formatMap = {
      woff2: 'woff2',
      woff: 'woff',
      ttf: 'truetype',
    }

    // Sort files by format preference (woff2 > woff > ttf)
    const sortedFiles = [...generatedFiles].sort((a, b) => {
      const order = { woff2: 0, woff: 1, ttf: 2 }
      const extA = a.split('.').pop()
      const extB = b.split('.').pop()
      return (order[extA] || 3) - (order[extB] || 3)
    })

    console.log(`\nCSS @font-face:`)
    console.log(`@font-face {
  font-family: '${inputFileName}';
  src: ${sortedFiles
    .map(file => {
      const ext = file.split('.').pop()
      return `url(${file}) format('${formatMap[ext] || ext}')`
    })
    .join(',\n       ')};
}`)
  } catch (error) {
    console.error('\n✗ Error minifying font:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Export for testing
export { runCLI }

// Auto-run CLI when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI()
}
