# minify-font

English | [简体中文](./README.md)

A Simple and Easy-to-Use Font Subsetting Tool

A lightweight font subsetting and conversion tool that supports multiple font formats and can significantly reduce font file sizes.



## Features

- **Font Subsetting**: Keep only the characters you need, dramatically reducing file size
- **Format Conversion**: Convert between TTF, OTF, WOFF, WOFF2, EOT, and SVG formats
- **Batch Generation**: Generate multiple web font formats at once
- **CLI Tool**: Easy integration into build processes
- **Programmable**: JavaScript API for programmatic use
- **Predefined Character Sets**: Built-in common Chinese character sets



## Installation

```bash
npm install minify-font
```

Install CLI tool globally:

```bash
npm install -g minify-font
```



## CLI Usage

You can easily integrate it into your project scripts with support for predefined character sets (see [top-used-chars](https://www.npmjs.com/package/top-used-chars))

![](https://img.alicdn.com/imgextra/i2/O1CN01ZJ9QfI1fK6D15dN66_!!6000000003987-1-tps-1300-414.gif)

```bash
minify-font <input-font-path> [options]

Options:
  -c, --collection <name>   Use predefined character set:
                            top500,  top2500 (default), commonlyUsed
  -w, --words <words>       Custom characters (can be combined with -c)
  -o, --output <output>     Output file or directory (default: input filename + .min suffix)
  -f, --formats <formats>   Output formats (comma-separated, default: ttf,woff,woff2)
  --input-options <json>    Input font options (JSON string)
  --output-options <json>   Output font options (JSON string)

Examples:
  minify-font font.ttf                              # Use default top2500 character set
  minify-font font.ttf -c top500                    # Use 500 most common characters
  minify-font font.ttf -c commonlyUsed -o output/   # Use commonly used characters
  minify-font font.ttf -w "Hello World"             # Include only custom characters
  minify-font font.ttf -f woff2                     # Generate only woff2 format
  minify-font font.ttf -f ttf,woff -o dist/         # Generate multiple formats
```



## Module Usage

### minifyFont(options: MinifyFontOptions): Promise<void>

Convert and subset fonts, powered by [fonteditor-core](https://www.npmjs.com/package/fonteditor-core)

```typescript
interface MinifyFontOptions {
  input: string // Input font file path
  output: string // Output font file path
  text: string // Characters to include
  inputOptions?: FontReadOptions // Input options (see below)
  outputOptions?: FontWriteOptions // Output options (see below)
}

// Input Options (FontReadOptions)
interface FontReadOptions {
  hinting?: boolean // Preserve hinting table (default: false)
  kerning?: boolean // Preserve kerning table (letter spacing, default: false)
  compound2simple?: boolean // Convert compound glyphs to simple glyphs (default: true)
  combinePath?: boolean // Combine SVG paths (default: true, SVG only)
  inflate?: (data: number[]) => number[] // Custom decompression function (for WOFF)
}

// Output Options (FontWriteOptions)
interface FontWriteOptions {
  hinting?: boolean // Preserve hinting (default: false)
  kerning?: boolean // Preserve kerning (default: false)
  writeZeroContoursGlyfData?: boolean // Write glyph data for empty contours (default: false)
  metadata?: string // SVG metadata (SVG output only)
  deflate?: (data: number[]) => number[] // Custom compression function (for WOFF)
  support?: {
    // Override head table data
    head?: { xMin?: number; yMin?: number; xMax?: number; yMax?: number }
    // Override hhea table data
    hhea?: { advanceWidthMax?: number; xMaxExtent?: number }
  }
}
```

Usage Examples:

```js
import { minifyFont } from 'minify-font'

// Basic usage: TTF to WOFF2 with character subsetting
await minifyFont({
  input: './fonts/source.ttf',
  output: './fonts/output.woff2',
  text: 'Hello, World! 你好世界',
})

// Convert font format (TTF -> WOFF)
await minifyFont({
  input: './fonts/source.ttf',
  output: './fonts/output.woff',
  text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
})

// Preserve hinting and kerning (higher quality, larger file)
await minifyFont({
  input: './fonts/source.ttf',
  output: './fonts/output.woff2',
  text: 'Common Chinese characters',
  inputOptions: {
    hinting: true, // Preserve font hinting
    kerning: true, // Preserve kerning information
  },
  outputOptions: {
    hinting: true, // Output with hinting
    kerning: true, // Output with kerning
  },
})

// Convert compound glyphs to simple glyphs
await minifyFont({
  input: './fonts/complex.otf',
  output: './fonts/simple.ttf',
  text: 'ABC',
  inputOptions: {
    compound2simple: true, // Convert compound to simple glyphs
  },
})
```



### createWebFonts(options: CreateWebFontsOptions): Promise<CreateWebFontsResult>

Generate ttf, woff2, and woff font files at once

```typescript
interface CreateWebFontsOptions {
  input: string // Input font file path
  outputDir?: string // Output directory (default: output folder in same directory as input)
  text: string // Characters to include
  resolveFileName?: (info: { basename: string; ext: string }) => string // Custom filename function
  formats?: string[] // Font formats to generate (default: ['woff2', 'woff', 'ttf'])
}

interface CreateWebFontsResult {
  outputDir: string // Output directory path
  fonts: Array<{
    format: string // Font format (e.g., 'woff2', 'woff', 'ttf')
    path: string // Full path to the font file
    success: boolean // Whether generation succeeded
    error?: Error // Error information if failed
  }>
}
```

Usage Examples:

```js
const result = await createWebFonts({
  input: './input/font.ttf',
  outputDir: './output',
  text: 'Hello, World!',
  formats: ['woff2', 'woff', 'ttf'], // Optional, defaults to woff2, woff, ttf
  resolveFileName: ({ basename, ext }) => `${basename}.${ext}`,
})

// Check generation results
console.log('Output directory:', result.outputDir)
result.fonts.forEach(font => {
  if (font.success) {
    console.log(`✓ ${font.format}: ${font.path}`)
  } else {
    console.error(`✗ ${font.format} failed:`, font.error)
  }
})
```



## Advanced Options

### inputOptions (Input Options)

#### `hinting` (boolean, default: false)

**Hinting** consists of instructions in the font to improve rendering quality at small sizes.

- ✅ **Enable**: Better small font size rendering, but larger file
- ❌ **Disable**: Smaller file, usually not needed for web fonts

```js
inputOptions: {
  hinting: true // Recommended for desktop apps requiring small font sizes
}
```

#### `kerning` (boolean, default: false)

**Kerning** is a table that controls spacing between specific character pairs (like "AV").

- ✅ **Enable**: Better typography quality
- ❌ **Disable**: Smaller file

```js
inputOptions: {
  kerning: true // Recommended for high-quality typography
}
```

#### `compound2simple` (boolean, default: true)

Convert compound glyphs (glyphs that reference other glyphs) to simple glyphs.

- ✅ **Enable**: Better compatibility, some tools don't support compound glyphs
- ❌ **Disable**: Preserve original glyph structure

```js
inputOptions: {
  compound2simple: true // Recommended to keep default
}
```

#### `combinePath` (boolean, default: true)

For SVG fonts only, combine multiple paths into one glyph.

```js
inputOptions: {
  combinePath: true // Only relevant for SVG processing
}
```

### outputOptions (Output Options)

#### `hinting` / `kerning` (boolean, default: false)

Same as inputOptions, controls whether to preserve this information in output.

#### `writeZeroContoursGlyfData` (boolean, default: false)

Whether to write data for glyphs with empty contours. Usually keep default.

#### `metadata` (string)

For SVG output only, add metadata information.

```js
outputOptions: {
  metadata: '<?xml version="1.0" standalone="no"?>'
}
```

#### `support` (object)

Manually override font metrics, advanced usage.

```js
outputOptions: {
  support: {
    head: {
      xMin: 0,
      yMin: -200,
      xMax: 1000,
      yMax: 800
    }
  }
}
```



### Options Usage Recommendations

| Scenario                     | hinting  | kerning  | compound2simple | File Size | Quality   |
| ---------------------------- | -------- | -------- | --------------- | --------- | --------- |
| **Web Font (Recommended)**   | ❌ false | ❌ false | ✅ true         | Smallest  | Good      |
| **High Quality Web Font**    | ❌ false | ✅ true  | ✅ true         | Medium    | Excellent |
| **Desktop Application Font** | ✅ true  | ✅ true  | ❌ false        | Largest   | Best      |
| **Maximum Compression**      | ❌ false | ❌ false | ✅ true         | Smallest  | Basic     |

**Web Font Best Practice:**

```js
// Recommended configuration for most web scenarios
await minifyFont({
  input: 'font.ttf',
  output: 'font.woff2',
  text: 'Your website text',
  // No need to set inputOptions and outputOptions
  // Default values are already optimized for web fonts
})
```



## Supported Font Formats

| Format | Input | Output | Description                                    |
| ------ | ----- | ------ | ---------------------------------------------- |
| TTF    | ✅    | ✅     | TrueType Font                                  |
| OTF    | ✅    | ✅     | OpenType Font                                  |
| WOFF   | ✅    | ✅     | Web Open Font Format                           |
| WOFF2  | ✅    | ✅     | Web Open Font Format 2.0 (Recommended for Web) |
| EOT    | ✅    | ✅     | Embedded OpenType                              |
| SVG    | ✅    | ✅     | SVG Font                                       |



## Use Cases

### 1. Reduce Chinese Font File Size

Chinese fonts typically contain thousands of characters, with complete font files reaching several MB. By subsetting to keep only the characters actually used on your webpage, you can reduce the size to tens of KB.

```bash
# Keep only characters used in website title
minify-font my-font.ttf -w "Welcome to My Website" -o dist/
```

### 2. Web Font Optimization

Generate all web font formats at once for best browser compatibility:

```bash
minify-font font.ttf -c top2500 -f ttf,woff,woff2 -o dist/fonts/
```

### 3. Build Process Integration

Add font processing scripts to package.json:

```json
{
  "scripts": {
    "build:fonts": "minify-font src/fonts/*.ttf -c commonlyUsed -o dist/fonts/"
  }
}
```

### 4. Dynamic Font Generation

Dynamically generate optimized fonts in Node.js programs:

```js
import { createWebFonts } from 'minify-font'
import { readFileSync } from 'fs'

// Get actual text used on website from database or CMS
const contentText = await fetchAllPageContent()

// Generate optimized fonts
const result = await createWebFonts({
  input: './fonts/source.ttf',
  outputDir: './public/fonts',
  text: contentText,
  formats: ['woff2', 'woff'],
})
```



## FAQ

### How to determine which characters to include?

1. **Use predefined character sets**: Suitable for most Chinese websites

   ```bash
   minify-font font.ttf -c top2500  # 2500 most common Chinese characters
   ```

2. **Extract actual text from website**: More precise, smaller size

   ```bash
   # Extract all text from HTML
   cat *.html | grep -o . | sort -u | tr -d '\n' > chars.txt
   minify-font font.ttf -w "$(cat chars.txt)" -o output.woff2
   ```

3. **Combine**: Character set + additional characters
   ```bash
   minify-font font.ttf -c top1000 -w "Special©®™"
   ```

### Why do I need multiple font formats?

Different browsers support different font formats. It's recommended to provide multiple formats for compatibility:

- **WOFF2**: Latest format, highest compression, use first (Chrome 36+, Firefox 39+, Safari 12+)
- **WOFF**: Widely supported web font format (IE9+, all modern browsers)
- **TTF**: Fallback format, compatible with older browsers

Using in CSS:

```css
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2'), url('font.woff') format('woff'), url('font.ttf') format('truetype');
}
```



## Dependencies

- [fonteditor-core](https://www.npmjs.com/package/fonteditor-core) - Core font processing library
- [top-used-chars](https://www.npmjs.com/package/top-used-chars) - Predefined Chinese character sets

## License

MIT
