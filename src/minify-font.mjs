import { Font, woff2 } from 'fonteditor-core'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const VALID_FONT_TYPES = ['ttf', 'otf', 'eot', 'svg', 'woff', 'woff2']

export async function minifyFont({ input, output, text, inputOptions, outputOptions }) {
  const [inputType, outputType] = [extname(input).slice(1), extname(output).slice(1)]

  if (!existsSync(input)) {
    throw new Error(`${input} is not exists`)
  }

  if (!VALID_FONT_TYPES.includes(inputType)) {
    throw new Error(`Invalid input font type: ${inputType}`)
  }

  if (!VALID_FONT_TYPES.includes(outputType)) {
    throw new Error(`Invalid output font type: ${outputType}`)
  }

  if (inputType === 'woff2' || outputType === 'woff2') {
    await woff2.init()
  }

  const inputBuffer = await readFile(input)
  const inputFont = Font.create(inputBuffer, {
    ...inputOptions,
    type: inputType,
    subset: text && text.split('').map(d => d.charCodeAt(0)),
  })
  const outputBuffer = inputFont.write({
    ...outputOptions,
    type: outputType,
  })
  await writeFile(output, outputBuffer)
}
