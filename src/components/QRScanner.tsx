import React, { useState } from "react";
import QrScanner from "react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: { lectureId: number; classAddress: string }) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onCancel }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = (data: any) => {
    if (data) {
      try {
        // Handle different QR scanner response formats
        const rawData = data.text || data;
        let parsedData;

        if (typeof rawData === "string") {
          parsedData = JSON.parse(rawData);
        } else {
          parsedData = rawData;
        }

        if (parsedData && parsedData.lectureId && parsedData.classAddress) {
          setIsScanning(false);
          onScan({
            lectureId: Number(parsedData.lectureId),
            classAddress: parsedData.classAddress,
          });
        } else {
          setScanError(
            "Invalid QR code format. Please scan a valid attendance QR code."
          );
        }
      } catch (error) {
        console.error("Error parsing QR code data:", error);
        setScanError("Could not parse QR code data. Please try again.");
      }
    }
  };

  const handleError = (err: Error) => {
    console.error("QR Scanner error:", err);
    onError(err);
  };

  return (
    <Card className="p-4 flex flex-col items-center bg-gray-900/70 backdrop-blur-sm border border-gray-700 shadow-lg">
      <div className="w-full max-w-sm mx-auto">
        {isScanning && (
          <>
            <div className="rounded-lg overflow-hidden border-2 border-indigo-600">
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: "100%", height: "auto" }}
                constraints={{
                  video: {
                    facingMode: "environment",
                  },
                }}
              />
            </div>
            <div className="flex justify-center items-center mt-4 text-gray-300">
              <LoaderCircle
                className="animate-spin mr-2 text-indigo-400"
                size={16}
              />
              <p>Scanning... Position QR code in view</p>
            </div>
          </>
        )}

        {scanError && (
          <div className="text-red-400 mt-2 text-center">{scanError}</div>
        )}
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-indigo-700 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
        >
          Cancel
        </Button>
        {scanError && (
          <Button
            onClick={() => {
              setScanError(null);
              setIsScanning(true);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
};

export default QRScanner;
