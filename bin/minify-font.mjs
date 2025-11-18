#!/usr/bin/env node

import { minifyFont } from '../src/minify-font.mjs'
import { extname, dirname, join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { realpathSync, readFileSync } from 'node:fs'
import { TOP_USED_500_CHARS, TOP_USED_2500_CHARS, COMMONLY_USED_CHARS } from 'top-used-chars'

// Get version from package.json with error handling
function getVersion() {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(__dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version
  } catch {
    return '2.1.0' // fallback version
  }
}

// Character collection mapping
const COLLECTIONS = {
  top500: TOP_USED_500_CHARS,
  top2500: TOP_USED_2500_CHARS,
  commonlyUsed: COMMONLY_USED_CHARS,
}

/**
 * Main CLI entry point
 */
async function runCLI() {
  const args = process.argv.slice(2)

  // Show help if no arguments provided
  if (args.length === 0) {
    showHelp()
    process.exit(0)
  }

  // Parse command-line arguments
  const options = parseArguments(args)

  try {
    console.log(`\nProcessing: ${options.input}`)

    // Determine character text based on mode
    const { text, message } = determineCharacterText(
      options.words,
      options.collection,
      options.collectionSpecified
    )
    console.log(message)

    // Determine output formats and paths
    const outputFormats = determineOutputFormats(options.formats, options.output)
    const outputPaths = generateOutputPaths(options.input, options.output, outputFormats)

    // Generate fonts for all formats
    const generatedFiles = await generateFonts(
      options.input,
      text,
      outputPaths,
      outputFormats,
      options.inputOptions,
      options.outputOptions
    )

    // Output success message and file paths
    console.log('\n✓ Generated successfully:')
    generatedFiles.forEach(file => console.log(`  ${file}`))

    // Generate and display @font-face CSS
    const inputFileName = getInputFileName(options.input)
    const css = generateFontFaceCSS(generatedFiles, inputFileName)
    console.log(`
-----------------------------
CSS @font-face: ${inputFileName}
-----------------------------
`)
    console.log(css)
  } catch (error) {
    handleError(error)
  }
}

/**
 * Display help message
 */
function showHelp() {
  console.log('Usage: minify-font <input-font-path> [options]')
  console.log('')
  console.log('Options:')
  console.log('  -c, --collection <name>   Use predefined character collection:')
  console.log('                            top500, top2500 (default), commonlyUsed')
  console.log('  -w, --words <words>       Custom characters:')
  console.log('                            - Use alone: only include these characters')
  console.log('                            - Use with -c: append to collection')
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
  console.log('  minify-font font.ttf                              # Use default collection (top2500)')
  console.log('  minify-font font.ttf -c top500                    # Use top500 collection')
  console.log(
    '  minify-font font.ttf -w "Hello World"             # Only include "Hello World" (no collection)'
  )
  console.log('  minify-font font.ttf -c top500 -w "额外字符"       # Combine top500 + "额外字符"')
  console.log('  minify-font font.ttf -w "ABC" -o output/          # Specified words to output directory')
  console.log('  minify-font font.ttf -f woff2                     # Generate only woff2 format')
  console.log('  minify-font font.ttf -f ttf,woff -o dist/         # Multiple formats to directory')
}

/**
 * Display version information
 */
function showVersion() {
  console.log(`minify-font version ${getVersion()}`)
}

/**
 * Parse command-line arguments
 * @param {string[]} args - Command-line arguments
 * @returns {Object} Parsed options
 */
function parseArguments(args) {
  let input = null
  let words = null
  let collection = 'top2500' // default collection
  let collectionSpecified = false // track if -c was explicitly provided
  let output = null
  let formats = null
  let inputOptions = {}
  let outputOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '-h':
      case '--help':
        showHelp()
        process.exit(0)

      case '-v':
      case '--version':
        showVersion()
        process.exit(0)

      case '-c':
      case '--collection':
        collection = args[++i]
        collectionSpecified = true
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

  return {
    input,
    words,
    collection,
    collectionSpecified,
    output,
    formats,
    inputOptions,
    outputOptions,
  }
}

/**
 * Determine character text based on mode (specified/append/collection)
 * @param {string|null} words - Custom words provided by user
 * @param {string} collection - Collection name
 * @param {boolean} collectionSpecified - Whether collection was explicitly specified
 * @returns {Object} Object containing text and console message
 */
function determineCharacterText(words, collection, collectionSpecified) {
  let text
  let message = ''

  // Option 2 (Pure): Smart mode detection
  // Note: Use 'words !== null' instead of 'words' to handle empty strings
  if (words !== null && !collectionSpecified) {
    // Specified mode: Only use words (no collection)
    // Deduplicate characters in words
    const uniqueWords = Array.from(new Set([...words])).join('')
    text = uniqueWords
    message = `Using specified words only: ${text.length} unique chars`
  } else if (words !== null && collectionSpecified) {
    // Append mode: Combine collection + words
    const collectionText = COLLECTIONS[collection] || TOP_USED_2500_CHARS
    const combinedChars = new Set([...collectionText, ...words])
    text = Array.from(combinedChars).join('')
    message = `Using collection "${collection}" (${collectionText.length} chars) + custom words\nTotal: ${text.length} unique chars`
  } else {
    // Collection only (or default)
    text = COLLECTIONS[collection] || TOP_USED_2500_CHARS
    message = `Using character collection: ${collection} (${text.length} chars)`
  }

  return { text, message }
}

/**
 * Determine output formats to generate
 * @param {string|null} formats - User-specified formats (comma-separated)
 * @param {string|null} output - Output path
 * @returns {string[]} Array of format strings
 */
function determineOutputFormats(formats, output) {
  const hasOutputExtension = output && extname(output)

  if (formats) {
    // User specified formats explicitly
    return formats.split(',').map(f => f.trim())
  } else if (hasOutputExtension) {
    // User specified a specific output file with extension
    return [extname(output).slice(1)]
  } else {
    // Default: generate ttf, woff, woff2
    return ['ttf', 'woff', 'woff2']
  }
}

/**
 * Generate output file paths for each format
 * @param {string} input - Input file path
 * @param {string|null} output - Output path (file or directory)
 * @param {string[]} outputFormats - Array of format strings
 * @returns {string[]} Array of output file paths
 */
function generateOutputPaths(input, output, outputFormats) {
  const outputPaths = []
  const hasOutputExtension = output && extname(output)
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

  return outputPaths
}

/**
 * Generate font files for all formats
 * @param {string} input - Input font file path
 * @param {string} text - Characters to include
 * @param {string[]} outputPaths - Array of output file paths
 * @param {string[]} outputFormats - Array of format strings
 * @param {Object} inputOptions - Font input options
 * @param {Object} outputOptions - Font output options
 * @returns {Promise<string[]>} Array of generated file paths
 */
async function generateFonts(input, text, outputPaths, outputFormats, inputOptions, outputOptions) {
  // Ensure output directories exist for all files
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

  return generatedFiles
}

/**
 * Generate @font-face CSS block
 * @param {string[]} generatedFiles - Array of generated file paths
 * @param {string} inputFileName - Input file name (without extension)
 * @returns {string} CSS string
 */
function generateFontFaceCSS(generatedFiles, inputFileName) {
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

  return `@font-face {
  font-family: '${inputFileName}';
  src: ${sortedFiles
    .map(file => {
      const ext = file.split('.').pop()
      return `url(${file}) format('${formatMap[ext] || ext}')`
    })
    .join(',\n       ')};
}`
}

/**
 * Get input file name without extension
 * @param {string} input - Input file path
 * @returns {string} File name without extension
 */
function getInputFileName(input) {
  return input.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '')
}

/**
 * Handle errors and exit
 * @param {Error} error - Error object
 */
function handleError(error) {
  console.error('\n✗ Error minifying font:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

// Export for testing
export { runCLI }

// Auto-run CLI when executed directly
// Resolve symlinks (important for global npm installs where argv[1] is a symlink)
const executedPath = process.argv[1] ? realpathSync(process.argv[1]) : null

if (executedPath === fileURLToPath(import.meta.url)) {
  runCLI()
}
