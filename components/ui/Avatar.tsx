'use client';

import React, { useState } from 'react';
import styles from './Avatar.module.css';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  fallback, 
  size = 'md', 
  className = '',
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const classNames = [
    styles.avatar,
    styles[`size-${size}`],
    className
  ].filter(Boolean).join(' ');

  const showImage = src && !imageError;

  return (
    <div className={classNames} {...props}>
      {showImage ? (
        <img 
          src={src} 
          alt="Avatar" 
          className={styles.image} 
          onError={() => setImageError(true)} 
        />
      ) : (
        <div className={styles.fallback}>
          {fallback.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};
