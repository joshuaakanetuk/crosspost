import { useEffect, useRef, useState } from "react";

/**
 * Back-facing web camera modal that mirrors the attached mock:
 * - Large square preview of the current (live) camera view
 * - Subtle number overlay in the middle of the live view
 * - Six thumbnail squares along the bottom with numbers beneath them (6..1)
 * - Optional capture button to fill thumbnails with snapshots
 *
 * TailwindCSS required in your app. Uses native getUserMedia.
 */
export default function CameraModal({ 
  open = true, 
  onClose,
  onCapture 
}: { 
  open?: boolean; 
  onClose?: () => void;
  onCapture?: (media: string[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveIndex, setLiveIndex] = useState<number>(1); // number overlay in the large square
  const [thumbs, setThumbs] = useState<string[]>([]); // base64 images (dynamic array)
  const [isStarting, setIsStarting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;

    let currentStream: MediaStream | null = null;
    const start = async () => {
      try {
        setIsStarting(true);
        setStreamError(null);
        
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported. Please use HTTPS or a modern browser.");
        }
        
        // Try back camera first; fall back to any camera if needed
        const constraints: MediaStreamConstraints = {
          video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        };
        try {
          currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          // fallback for browsers that don't support exact environment or no back camera
          currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        setStreamError(err?.message || "Unable to access camera");
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [open]);

  const captureToThumbs = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    // Keep square thumbnails that match the mock
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // draw centered square crop from the video frame
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setThumbs((prev) => [dataUrl, ...prev]);
    setLiveIndex((n) => n + 1);
  };

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleDone = () => {
    if (onCapture && thumbs.length > 0) {
      onCapture(thumbs);
      setThumbs([]);
      setLiveIndex(1);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" 
      role="dialog" 
      aria-modal
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Camera</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={captureToThumbs}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
            >
              Capture
            </button>
            {thumbs.length > 0 && (
              <button
                onClick={handleDone}
                className="rounded-xl bg-blue-600 text-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-blue-700"
              >
                Use {thumbs.length} Photo{thumbs.length !== 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-4">
          {/* Large square preview */}
          <div className="relative mx-auto w-full max-w-[720px]">
            <div className="aspect-square w-full overflow-hidden rounded-2xl border-2 border-gray-800/80">
              <video
                ref={videoRef}
                playsInline
                className="h-full w-full object-cover"
                muted
              />
              {/* Center subtle number overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="select-none text-6xl font-semibold text-black/20">
                  {liveIndex}
                </span>
              </div>
            </div>
          </div>

          {streamError && (
            <p className="mx-auto max-w-prose rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {streamError}
            </p>
          )}
          {isStarting && (
            <p className="mx-auto text-sm text-gray-500">Starting camera…</p>
          )}

          {/* Thumbnails row - dynamically shown */}
          {thumbs.length > 0 && (
            <div className="mx-auto grid w-full max-w-[720px] grid-cols-6 gap-4">
              {thumbs.map((src, i) => {
                const label = thumbs.length - i; // dynamic numbering based on count
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="aspect-square w-full rounded-xl border-2 border-gray-800/80 bg-gray-100">
                      <img src={src} alt={`thumb ${label}`} className="h-full w-full object-cover rounded-[10px]" />
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-700">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
