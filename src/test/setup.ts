import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom (required by Radix UI primitives)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
    constructor(_callback: ResizeObserverCallback) {}
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  }
}

// Polyfill Element.hasPointerCapture for jsdom (required by Radix UI Slider)
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = function () {
    return false
  }
}
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = function () {
    /* noop */
  }
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = function () {
    /* noop */
  }
}

// Polyfill scrollIntoView for jsdom (required by Radix UI Select)
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = function () {
    /* noop */
  }
}
