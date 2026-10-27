import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { boot } from './store/app';
import './styles/theme.css';
import './styles/pages.css';
import './styles/family.css';

void boot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
