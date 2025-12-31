import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isSpeaking: boolean;
  theme: 'light' | 'dark';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyserNode, isSpeaking, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const colors = {
      light: {
        listening: 'rgb(99, 102, 241)', // indigo-500
        speaking1: 'rgba(99, 102, 241, 0.5)',
        speaking2: 'rgba(129, 140, 248, 0.5)', // indigo-400
        idle: 'rgba(99, 102, 241, 0.3)',
      },
      dark: {
        listening: 'rgb(129, 140, 248)', // indigo-400
        speaking1: 'rgba(129, 140, 248, 0.5)',
        speaking2: 'rgba(79, 70, 229, 0.5)', // indigo-600
        idle: 'rgba(129, 140, 248, 0.4)',
      }
  }
  const currentColors = colors[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const clearCanvas = () => {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawListening = (_time: number) => {
      if (!analyserNode) return;
      animationFrameId.current = requestAnimationFrame(drawListening);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteTimeDomainData(dataArray);

      clearCanvas();
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = currentColors.listening;
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    
    let radius = 25;
    let direction = 1;
    const drawSpeaking = (_time: number) => {
        animationFrameId.current = requestAnimationFrame(drawSpeaking);
        
        clearCanvas();

        radius += direction * 0.1;
        if (radius > 30 || radius < 20) {
            direction *= -1;
        }

        canvasCtx.beginPath();
        canvasCtx.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI);
        canvasCtx.fillStyle = currentColors.speaking1;
        canvasCtx.fill();
        
        canvasCtx.beginPath();
        canvasCtx.arc(canvas.width / 2, canvas.height / 2, radius * 0.7, 0, 2 * Math.PI);
        canvasCtx.fillStyle = currentColors.speaking2;
        canvasCtx.fill();
    };

    const drawIdle = () => {
        clearCanvas();
        canvasCtx.beginPath();
        canvasCtx.arc(canvas.width / 2, canvas.height / 2, 25, 0, 2 * Math.PI);
        canvasCtx.fillStyle = currentColors.idle;
        canvasCtx.fill();
    }

    if (analyserNode) {
      drawListening(0);
    } else if (isSpeaking) {
      drawSpeaking(0);
    } else {
      drawIdle();
    }

    return () => {
      if(animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyserNode, isSpeaking, theme, currentColors]);

  return <canvas ref={canvasRef} width="300" height="80" className="w-full max-w-md h-20" />;
};

export default AudioVisualizer;