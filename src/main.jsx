import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist/wght.css'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      closeButton
      toastOptions={{
        duration: 3500,
        classNames: {
          toast: 'font-sans !rounded-xl !border-line !bg-white !text-ink !shadow-panel',
          title: '!text-sm !font-semibold',
          description: '!text-xs !text-muted',
          actionButton: '!rounded-lg !bg-ink !text-white',
          cancelButton: '!rounded-lg !bg-zinc-100 !text-zinc-700',
        },
      }}
    />
  </StrictMode>,
)
