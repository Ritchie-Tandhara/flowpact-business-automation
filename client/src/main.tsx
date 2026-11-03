import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// React Flow's internal fit-view/resize logic can trigger the browser's
// "ResizeObserver loop completed with undelivered notifications" error, which
// is benign but surfaces as a full-page red overlay in Vite's dev error
// overlay. Debouncing the callback removes the loop at the source.
const NativeResizeObserver = window.ResizeObserver
window.ResizeObserver = class DebouncedResizeObserver extends NativeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    let frame = 0
    super((entries, observer) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => callback(entries, observer))
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
