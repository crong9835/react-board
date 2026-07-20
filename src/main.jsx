import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter가 URL 변화를 감지해서 App에게 알려줍니다. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
