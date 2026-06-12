"use client";

import { useState } from 'react';
import { useNotification } from './NotificationSystem';

export default function TelemetryIngestion({ onStreamComplete }: { onStreamComplete: (coords: { lat: number; lng: number }[]) => void }) {
  const { notify } = useNotification();
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSimulateStream = () => {
    setIsStreaming(true);
    setProgress(0);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsStreaming(false);
        notify("Telemetry stream complete. Perimeter polygon closed.", "success");
        // Simulate a closed polygon
        onStreamComplete([
          { lat: 51.505, lng: -0.09 },
          { lat: 51.51, lng: -0.1 },
          { lat: 51.51, lng: -0.08 },
          { lat: 51.505, lng: -0.09 },
        ]);
      }
    }, 500);
  };

  return (
    <div className="mt-4 p-4 bg-white/40 rounded-xl border border-white/50">
      <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        Mobile NMEA Telemetry (GPS/GLONASS)
      </h3>
      <button 
        onClick={handleSimulateStream}
        disabled={isStreaming}
        className="w-full bg-accent text-white py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
      >
        {isStreaming ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Streaming... {progress}%
          </>
        ) : (
          "Simulate Perimeter Walk"
        )}
      </button>
    </div>
  );
}
