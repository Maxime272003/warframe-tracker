import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'skeleton-elements/css/skeleton-elements.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
