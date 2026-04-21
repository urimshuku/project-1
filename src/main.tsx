import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ImagePreloader } from './components/ImagePreloader';
import { ThemeProvider } from './components/ThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ImagePreloader />
      <App />
    </ThemeProvider>
  </StrictMode>
);
