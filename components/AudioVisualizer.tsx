
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioElement, isPlaying }) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    // Initialize AudioContext and nodes once
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      
      try {
        sourceRef.current = audioCtxRef.current.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch (err) {
        console.warn("AudioContext source already created or failed:", err);
      }
    }

    // Fix: cast d3 to any to resolve missing property errors in the current type environment
    const svg = (d3 as any).select(canvasRef.current);
    const width = canvasRef.current.clientWidth || 400;
    const height = canvasRef.current.clientHeight || 128;
    const bufferLength = analyserRef.current?.frequencyBinCount || 0;
    const dataArray = new Uint8Array(bufferLength);
    const barWidth = (width / bufferLength) * 2.5;

    const draw = () => {
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
      
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Fix: removed type arguments because 'svg' is cast to 'any'
      const bars = svg.selectAll('rect')
        .data(Array.from(dataArray));

      bars.enter()
        .append('rect')
        .merge(bars)
        .attr('x', (d: any, i: number) => i * (barWidth + 2))
        .attr('y', (d: any) => height - (d / 255) * height)
        .attr('width', barWidth)
        .attr('height', (d: any) => (d / 255) * height)
        // Fix: cast d3 to any to access interpolateCool
        .attr('fill', (d: any, i: number) => (d3 as any).interpolateCool(i / bufferLength))
        .attr('rx', 2);

      bars.exit().remove();
    };

    if (isPlaying) {
      // Resume context if suspended (browser security)
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      draw();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, isPlaying]);

  return (
    <div className="w-full h-16 md:h-32 opacity-40 hover:opacity-100 transition-opacity duration-500">
      <svg ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default AudioVisualizer;
