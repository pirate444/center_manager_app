'use client';

import React, { useEffect, useRef } from 'react';
import styles from './Chart.module.css';

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartProps {
  type: 'bar' | 'line' | 'donut';
  data: ChartData[];
  title?: string;
  height?: number;
}

export function Chart({ type, data, title, height = 300 }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = React.useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    if (rect.width === 0) return; // Prevent drawing on invisible canvas

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const width = rect.width;
    const h = height;

    ctx.clearRect(0, 0, width, h);

    const defaultColors = ['#06b6d4', '#6366f1', '#ec4899', '#8b5cf6', '#10b981'];

    if (data.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, h / 2);
      return;
    }

    const maxValue = Math.max(...data.map(d => d.value));

    if (type === 'bar') {
      const padding = 40;
      const bottomPadding = 40;
      const chartWidth = width - padding * 2;
      const chartHeight = h - padding - bottomPadding;
      
      const barWidth = chartWidth / data.length;
      
      data.forEach((item, index) => {
        const barHeight = maxValue === 0 ? 0 : (item.value / maxValue) * chartHeight;
        const x = padding + index * barWidth + (barWidth * 0.1);
        const y = h - bottomPadding - barHeight;
        const actualBarWidth = barWidth * 0.8;

        ctx.fillStyle = item.color || defaultColors[index % defaultColors.length];
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, actualBarWidth, barHeight, [4, 4, 0, 0]);
        } else {
            ctx.rect(x, y, actualBarWidth, barHeight);
        }
        ctx.fill();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        let label = item.label;
        if (ctx.measureText(label).width > actualBarWidth) {
          label = label.substring(0, 3) + '..';
        }
        
        ctx.fillText(label, x + actualBarWidth / 2, h - bottomPadding + 20);

        ctx.fillStyle = '#fff';
        ctx.fillText(item.value.toString(), x + actualBarWidth / 2, y - 10);
      });

      ctx.beginPath();
      ctx.moveTo(padding, h - bottomPadding);
      ctx.lineTo(width - padding, h - bottomPadding);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();
    } else if (type === 'line') {
      const padding = 40;
      const bottomPadding = 40;
      const chartWidth = width - padding * 2;
      const chartHeight = h - padding - bottomPadding;
      const stepX = chartWidth / Math.max(1, data.length - 1);

      ctx.beginPath();
      data.forEach((item, index) => {
        const x = padding + index * stepX;
        const y = maxValue === 0 ? h - bottomPadding : h - bottomPadding - (item.value / maxValue) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      data.forEach((item, index) => {
        const x = padding + index * stepX;
        const y = maxValue === 0 ? h - bottomPadding : h - bottomPadding - (item.value / maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = item.color || '#06b6d4';
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, x, h - bottomPadding + 20);

        ctx.fillStyle = '#fff';
        ctx.fillText(item.value.toString(), x, y - 15);
      });
      
      ctx.beginPath();
      ctx.moveTo(padding, h - bottomPadding);
      ctx.lineTo(width - padding, h - bottomPadding);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();
    } else if (type === 'donut') {
      const cx = width / 2;
      const cy = h / 2;
      const radius = Math.min(cx, cy) * 0.8;
      const innerRadius = radius * 0.6;
      
      const total = data.reduce((sum, item) => sum + item.value, 0);
      let currentAngle = -Math.PI / 2;

      if (total === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.arc(cx, cy, innerRadius, 2 * Math.PI, 0, true);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
      } else {
        data.forEach((item, index) => {
          const sliceAngle = (item.value / total) * 2 * Math.PI;
          
          ctx.beginPath();
          ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
          ctx.arc(cx, cy, innerRadius, currentAngle + sliceAngle, currentAngle, true);
          ctx.closePath();
          
          ctx.fillStyle = item.color || defaultColors[index % defaultColors.length];
          ctx.fill();
          
          if (sliceAngle > 0.2) {
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = radius * 1.2;
            const lx = cx + Math.cos(labelAngle) * labelRadius;
            const ly = cy + Math.sin(labelAngle) * labelRadius;
            
            ctx.fillStyle = '#e5e7eb';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = Math.cos(labelAngle) > 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${item.label} (${item.value})`, lx, ly);
          }

          currentAngle += sliceAngle;
        });
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(total.toString(), cx, cy);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Total', cx, cy + 20);
    }
  }, [data, type, height]);

  useEffect(() => {
    const handleResize = () => {
      setTick(t => t + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={styles.wrapper}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.chartContainer} ref={containerRef}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}
