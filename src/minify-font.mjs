import { Font, woff2 } from 'fonteditor-core'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const VALID_FONT_TYPES = ['ttf', 'otf', 'eot', 'svg', 'woff', 'woff2']

/**
 * 字体裁剪和格式转换
 * 支持多种字体格式互转，并可对字体进行字符子集裁剪
 *
 * @param {Object} options - 配置选项
 * @param {string} options.input - 输入字体文件路径
 * @param {string} options.output - 输出字体文件路径
 * @param {string} [options.text] - 需要包含的文字内容，只保留这些字符以减小文件体积
 * @param {Object} [options.inputOptions] - 字体读取选项
 * @param {boolean} [options.inputOptions.hinting=false] - 是否保留 hinting 表（字体微调信息）
 * @param {boolean} [options.inputOptions.kerning=false] - 是否保留 kerning 表（字距调整信息）
 * @param {boolean} [options.inputOptions.compound2simple=true] - 是否将复合字形转换为简单字形
 * @param {boolean} [options.inputOptions.combinePath=true] - 是否合并 SVG 路径（仅 SVG）
 * @param {Function} [options.inputOptions.inflate] - 自定义解压函数（用于 WOFF）
 * @param {Object} [options.outputOptions] - 字体写入选项
 * @param {boolean} [options.outputOptions.hinting=false] - 输出时是否保留 hinting
 * @param {boolean} [options.outputOptions.kerning=false] - 输出时是否保留 kerning
 * @param {boolean} [options.outputOptions.writeZeroContoursGlyfData=false] - 是否写入空轮廓的字形数据
 * @param {string} [options.outputOptions.metadata] - SVG 元数据（仅 SVG）
 * @param {Function} [options.outputOptions.deflate] - 自定义压缩函数（用于 WOFF）
 * @param {Object} [options.outputOptions.support] - 覆盖字体度量值
 * @returns {Promise<void>}
 * @throws {Error} 输入文件不存在时抛出错误
 * @throws {Error} 不支持的字体格式时抛出错误
 *
 * @example
 * // 基本用法：裁剪字符并转换格式
 * await minifyFont({
 *   input: './font.ttf',
 *   output: './font.woff2',
 *   text: 'Hello, World!'
 * })
 *
 * @example
 * // 保留高质量信息
 * await minifyFont({
 *   input: './font.ttf',
 *   output: './font.woff2',
 *   text: '常用汉字',
 *   inputOptions: {
 *     hinting: true,
 *     kerning: true
 *   },
 *   outputOptions: {
 *     hinting: true,
 *     kerning: true
 *   }
 * })
 */
export async function minifyFont({ input, output, text, inputOptions, outputOptions }) {
  if (!existsSync(input)) {
    throw new Error(`${input} is not exists`)
  }

  const [inputType, outputType] = [extname(input).slice(1), extname(output).slice(1)]

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
