import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CloudShell from './CloudShell'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><CloudShell /></StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
}
