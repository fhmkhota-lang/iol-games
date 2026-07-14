import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is applied selectively in App.tsx — the Mandela experience
// uses an imperative Three.js loop that breaks under double-effect invocation.
createRoot(document.getElementById('root')!).render(<App />)
