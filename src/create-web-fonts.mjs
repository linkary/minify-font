import path from 'node:path'
import { minifyFont } from './minify-font.mjs'
import { ensureDir } from './ensure-dir.mjs'

/**
 * 一次性创建多种 Web 字体格式（ttf, woff2, woff 等）
 *
 * 该函数会并行生成多种字体格式，即使某个格式失败，其他格式也能继续生成。
 * 非常适合用于 Web 项目批量生成字体文件。
 *
 * @param {Object} options - 配置选项
 * @param {string} options.input - 输入的字体文件路径（支持 ttf, otf, woff, woff2 等格式）
 * @param {string} options.text - 需要包含的文字内容，只保留这些字符以减小文件体积
 * @param {string} [options.outputDir] - 输出目录，默认为输入文件同级目录下的 output 文件夹
 * @param {Function} [options.resolveFileName] - 自定义文件名函数 resolveFileName({ basename, ext }) => string
 * @param {string[]} [options.formats=['woff2', 'woff', 'ttf']] - 要生成的字体格式数组
 * @returns {Promise<CreateWebFontsResult>} 生成结果，包含输出目录和每个字体文件的详细信息
 * @returns {string} return.outputDir - 输出目录的绝对路径
 * @returns {Array<Object>} return.fonts - 生成的字体文件信息数组
 * @returns {string} return.fonts[].format - 字体格式（如 'woff2', 'woff', 'ttf'）
 * @returns {string} return.fonts[].path - 字体文件的完整路径
 * @returns {boolean} return.fonts[].success - 是否成功生成
 * @returns {Error} [return.fonts[].error] - 失败时的错误信息
 * @throws {Error} 当 input 参数缺失时抛出错误
 * @throws {Error} 当 text 参数缺失时抛出错误
 * @throws {Error} 当 formats 不是非空数组时抛出错误
 *
 * @example
 * // 基本用法：生成默认的三种格式
 * const result = await createWebFonts({
 *   input: './font.ttf',
 *   text: 'Hello, World! 你好世界'
 * })
 * console.log(result.fonts) // [{ format: 'woff2', path: '...', success: true }, ...]
 *
 * @example
 * // 自定义输出目录和格式
 * const result = await createWebFonts({
 *   input: './font.ttf',
 *   outputDir: './dist/fonts',
 *   text: '常用汉字',
 *   formats: ['woff2', 'woff'] // 只生成 WOFF2 和 WOFF
 * })
 *
 * @example
 * // 自定义文件名
 * const result = await createWebFonts({
 *   input: './font.ttf',
 *   text: 'ABC',
 *   resolveFileName: ({ basename, ext }) => `${basename}.min.${ext}`
 * })
 * // 输出: font.min.woff2, font.min.woff, font.min.ttf
 *
 * @example
 * // 检查生成结果
 * const result = await createWebFonts({ input: 'font.ttf', text: 'Hello' })
 * result.fonts.forEach(font => {
 *   if (font.success) {
 *     console.log(`✓ ${font.format}: ${font.path}`)
 *   } else {
 *     console.error(`✗ ${font.format} failed:`, font.error.message)
 *   }
 * })
 */
export async function createWebFonts({
  input,
  outputDir,
  text,
  resolveFileName,
  formats = ['woff2', 'woff', 'ttf'],
}) {
  // Input validation
  if (!input) {
    throw new Error('input parameter is required')
  }
  if (!text) {
    throw new Error('text parameter is required')
  }
  if (!Array.isArray(formats) || formats.length === 0) {
    throw new Error('formats must be a non-empty array')
  }

  const basename = path.basename(input, path.extname(input))
  const targetDir = outputDir || path.resolve(path.dirname(input), './output')
  ensureDir(targetDir)

  // Use Promise.allSettled for better error handling
  const results = await Promise.allSettled(
    formats.map(targetType =>
      minifyFont({
        input,
        output: path.resolve(
          targetDir,
          typeof resolveFileName === 'function'
            ? resolveFileName({ basename, ext: targetType })
            : `${basename}.${targetType}`
        ),
        text,
      })
    )
  )

  // Map results to detailed information
  const fonts = formats.map((format, index) => {
    const result = results[index]
    const filename =
      typeof resolveFileName === 'function'
        ? resolveFileName({ basename, ext: format })
        : `${basename}.${format}`
    const fontPath = path.resolve(targetDir, filename)

    if (result.status === 'fulfilled') {
      return {
        format,
        path: fontPath,
        success: true,
      }
    } else {
      return {
        format,
        path: fontPath,
        success: false,
        error: result.reason,
      }
    }
  })

  return {
    outputDir: targetDir,
    fonts,
  }
}
