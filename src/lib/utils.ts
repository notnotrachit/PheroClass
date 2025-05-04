import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// PWA Service Worker Update Utility

// Function to check if service worker needs update
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          
          // Check for updates to the service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed but waiting, notify user
                const updateEvent = new Event('sw-update-available');
                window.dispatchEvent(updateEvent);
              }
            });
          });
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
        
      // Handle service worker update when page reloads
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  }
}

// Check if the app can be installed (PWA criteria met)
export function checkPwaInstallable(callback) {
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Notify the callback that the app is installable
    if (callback) {
      callback(true, deferredPrompt);
    }
  });
  
  // If the app is already installed, this event fires
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    
    // Notify the callback that the app is installed
    if (callback) {
      callback(false);
    }
  });
}

// Function to check if the device is online
export function isOnline() {
  return navigator.onLine;
}

// Add online/offline event listeners
export function setupNetworkListeners(onlineCallback, offlineCallback) {
  window.addEventListener('online', () => {
    if (onlineCallback) {
      onlineCallback();
    }
  });
  
  window.addEventListener('offline', () => {
    if (offlineCallback) {
      offlineCallback();
    }
  });
}
