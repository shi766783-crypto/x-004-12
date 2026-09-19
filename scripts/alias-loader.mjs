// 测试用：把 @/xxx 解析到 src/xxx（无扩展名时尝试 .js / /index.js），对齐 Vite 解析规则
import { existsSync, statSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'

// scripts/alias-loader.mjs -> 项目根
const SRC_ROOT = pathToFileURL(process.cwd().replace(/\/$/, '') + '/src/')

function isFile(url) {
  try {
    return existsSync(fileURLToPath(url)) && statSync(fileURLToPath(url)).isFile()
  } catch {
    return false
  }
}

function resolveFile(base) {
  if (isFile(base)) return base
  const direct = new URL(base.href + '.js')
  if (isFile(direct)) return direct
  const index = new URL(base.href + '/index.js')
  if (isFile(index)) return index
  return direct
}

export async function resolve(specifier, context, nextResolve) {
  let url = null
  if (specifier.startsWith('@/')) {
    url = new URL(specifier.slice(2), SRC_ROOT)
  } else if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[a-zA-Z0-9]+$/.test(specifier)
  ) {
    url = new URL(specifier, context.parentURL)
  }
  if (url) {
    return { url: resolveFile(url).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
