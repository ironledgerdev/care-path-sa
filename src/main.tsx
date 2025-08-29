import { createRoot } from 'react-dom/client'
import './utils/suppressResizeObserverError';
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
