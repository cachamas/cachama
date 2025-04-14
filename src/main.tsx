import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Remove loading screen once the app is mounted
window.addEventListener('load', () => {
  const loadingScreen = document.getElementById('loading-screen')
  if (loadingScreen) {
    loadingScreen.style.opacity = '0'
    loadingScreen.style.transition = 'opacity 0.5s ease-out'
    setTimeout(() => {
      loadingScreen.remove()
    }, 500)
  }
})
