export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim() || 'object'
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  // Defer cleanup so the browser has time to initiate the download.
  // When triggerDownload is called from an async callback (e.g. after
  // JSZip.generateAsync), synchronous cleanup can race with headless
  // Chromium's download initiation.
  setTimeout(() => {
    if (typeof document !== 'undefined') {
      document.body.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }, 100)
}
