import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ensureDir } from './ensure-dir.mjs'
import fs from 'node:fs'

vi.mock('node:fs')

describe('ensureDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not create directory if it already exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    ensureDir('/existing/dir')
    expect(fs.mkdirSync).not.toHaveBeenCalled()
  })

  it('should create directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('/new/dir')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true })
  })

  it('should call existsSync with correct path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    ensureDir('/test/path')
    expect(fs.existsSync).toHaveBeenCalledWith('/test/path')
  })

  it('should create directory with recursive option', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('/parent/child/grandchild')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/parent/child/grandchild', { recursive: true })
  })

  it('should handle relative paths', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('./relative/path')
    expect(fs.mkdirSync).toHaveBeenCalledWith('./relative/path', { recursive: true })
  })

  it('should handle nested directory creation', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('/a/b/c/d/e')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/a/b/c/d/e', { recursive: true })
  })

  it('should handle single directory', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('/single')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/single', { recursive: true })
  })

  it('should not throw error when directory exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    expect(() => ensureDir('/existing')).not.toThrow()
  })

  it('should handle multiple calls with same directory', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true)

    ensureDir('/test')
    expect(fs.mkdirSync).toHaveBeenCalledTimes(1)

    ensureDir('/test')
    expect(fs.mkdirSync).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple different directories', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    ensureDir('/dir1')
    ensureDir('/dir2')
    ensureDir('/dir3')

    expect(fs.mkdirSync).toHaveBeenCalledTimes(3)
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dir1', { recursive: true })
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dir2', { recursive: true })
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dir3', { recursive: true })
  })

  it('should handle empty string path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('')
    expect(fs.mkdirSync).toHaveBeenCalledWith('', { recursive: true })
  })

  it('should handle paths with trailing slash', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    ensureDir('/test/path/')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/test/path/', { recursive: true })
  })
})


