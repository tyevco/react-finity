import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeFilename, triggerDownload } from '../exportUtils'

describe('sanitizeFilename', () => {
  it('returns alphanumeric names unchanged', () => {
    expect(sanitizeFilename('my-file_v2.stl')).toBe('my-file_v2.stl')
  })

  it('replaces special characters with underscores', () => {
    expect(sanitizeFilename('file<name>:test')).toBe('file_name__test')
  })

  it('returns "object" for empty string', () => {
    expect(sanitizeFilename('')).toBe('object')
  })

  it('returns "object" for whitespace-only string', () => {
    expect(sanitizeFilename('   ')).toBe('object')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello')
  })

  it('handles unicode characters', () => {
    expect(sanitizeFilename('bin\u00e9')).toBe('bin_')
  })

  it('preserves dots and spaces in filenames', () => {
    expect(sanitizeFilename('My Bin 1x1.stl')).toBe('My Bin 1x1.stl')
  })
})

describe('triggerDownload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a link element, clicks it, and cleans up', () => {
    const fakeUrl = 'blob:http://localhost/fake-id'
    const createObjUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl)
    const revokeObjUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
    )

    const clickSpy = vi.fn()
    const appendSpy = vi.fn().mockImplementation((node: Node) => node)
    const removeSpy = vi.fn().mockImplementation((node: Node) => node)
    vi.spyOn(document.body, 'appendChild').mockImplementation(appendSpy)
    vi.spyOn(document.body, 'removeChild').mockImplementation(removeSpy)
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement)

    const blob = new Blob(['test'], { type: 'text/plain' })
    triggerDownload(blob, 'test.txt')

    expect(createObjUrlSpy).toHaveBeenCalledWith(blob)
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(appendSpy).toHaveBeenCalledOnce()
    expect(removeSpy).toHaveBeenCalledOnce()
    expect(revokeObjUrlSpy).toHaveBeenCalledWith(fakeUrl)
  })
})
