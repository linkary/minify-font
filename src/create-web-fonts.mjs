import path from 'node:path'
import { minifyFont } from './minify-font.mjs'
import { ensureDir } from './ensure-dir.mjs'

/**
 * 一次性创建 ttf, woff2, woff 字体文件
 * @param {string} input - 输入的字体文件路径
 * @param {string} text - 需要包含的文字内容
 * @param {string} [outputDir] - 输出的文字文件目录, 默认为字体输入文件同级目录下的 output 文件夹
 * @param {function} [resolveFileName({ basename, ext })] - 自定义字体文件名
 * @returns font Files - 字体文件数组
 */
export async function createWebFonts({ input, outputDir, text, resolveFileName }) {
  const targetFonts = ['woff2', 'woff', 'ttf']
  const basename = path.basename(input, path.extname(input))
  const targetDir = outputDir || path.resolve(path.dirname(input), './output')
  ensureDir(targetDir)

  await Promise.all(
    targetFonts.map(targetType =>
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

  return targetFonts.map(font => `${basename}.${font}`)
}
