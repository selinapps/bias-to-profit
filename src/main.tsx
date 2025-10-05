import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Application initialized
import { logger } from '@/lib/logger';
logger.info('Application starting...');

// Suppress Chrome extension errors that interfere with the app
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('chrome-extension://')) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.toString().includes('chrome-extension://')) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use correct base path for GitHub Pages deployment
    const basePath = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${basePath}sw.js?v=4`)
      .then((registration) => {
        logger.info('Service Worker registered successfully:', registration);
        
        // Check for updates and force refresh on mobile
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Force reload to get the new service worker
                window.location.reload();
              }
            });
          }
        });
        
        // Force update check on mobile devices
        if (window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          registration.update();
        }
      })
      .catch((error) => {
        logger.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
