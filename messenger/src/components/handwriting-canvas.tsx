import { useRef, useEffect, useState } from 'react';

interface HandwritingCanvasProps {
  onSend: (imageData: string) => void;
}

export function HandwritingCanvas({ onSend }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    // Convert canvas to base64 data URL
    const imageData = canvas.toDataURL('image/png');

    onSend(imageData);
    handleClear();
  };

  return (
    <div className="flex h-full flex-1">
      <canvas
        ref={canvasRef}
        className="w-full h-[45px] cursor-crosshair flex-1"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div
        aria-disabled={!hasContent}
        onClick={handleSend}
        className={`!text-lg border border-[#93989C] bg-[#FBFBFB] w-[58px] h-full rounded-[5px] font-bold text-[0.6875em] flex items-center justify-center ${hasContent ? "text-[#31497C] cursor-pointer" : "text-[#969C9A]"}`}
        style={{ boxShadow: '-4px -4px 4px #C0C9E0 inset', fontFamily: 'Pixelated MS Sans Serif' }}>
        Send
      </div>
    </div>
  );
}
