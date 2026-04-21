import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ImagePreloader } from './components/ImagePreloader';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ImagePreloader />
      <div className="fixed left-1/2 top-9 z-[70] -translate-x-1/2 -translate-y-1/2 sm:top-11 md:top-[60px]">
        <ThemeToggle />
      </div>
      <App />
    </ThemeProvider>
  </StrictMode>
);
