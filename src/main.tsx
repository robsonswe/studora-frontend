import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { StudoraProvider } from '@/context/StudoraContext';
import './index.css'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudoraProvider>
      <RouterProvider router={router} />
    </StudoraProvider>
  </StrictMode>,
)
