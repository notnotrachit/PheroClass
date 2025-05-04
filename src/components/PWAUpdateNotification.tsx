// PWA Update Notification Component

import React, { useState, useEffect } from "react";
import { toast } from "../hooks/use-toast";

const PWAUpdateNotification = () => {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  useEffect(() => {
    // Check for service worker updates
    if ("serviceWorker" in navigator) {
      let refreshing = false;

      // When the service worker is updated, a "controllerchange" event is fired
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload(); // Reload the page when the new service worker takes over
      });

      // Handle new updates available
      window.addEventListener("sw-update-available", () => {
        setNewVersionAvailable(true);
        toast({
          title: "Update Available",
          description: "A new version is available. Click to refresh.",
          action: (
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
            >
              Update
            </button>
          ),
          duration: 0, // Don't automatically dismiss
        });
      });
    }
  }, []);

  // No visual component unless needed
  return null;
};

export default PWAUpdateNotification;
