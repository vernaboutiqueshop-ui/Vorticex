import React from 'react';

// Skeleton base con animación pulse
const SkeletonBase = ({ style, className }) => (
  <div 
    className={`skeleton-pulse ${className || ''}`}
    style={{
      background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      borderRadius: '8px',
      ...style
    }}
  />
);

// Skeleton para ejercicio (GIF + nombre)
export const ExerciseSkeleton = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
    <SkeletonBase style={{ width: 56, height: 56, borderRadius: '12px' }} />
    <div style={{ flex: 1 }}>
      <SkeletonBase style={{ width: '70%', height: 16, marginBottom: 8 }} />
      <SkeletonBase style={{ width: '40%', height: 12 }} />
    </div>
  </div>
);

// Skeleton para post de comunidad
export const PostSkeleton = () => (
  <div style={{ 
    background: 'var(--surface-1)',
    borderRadius: '16px', 
    padding: '16px',
    marginBottom: '12px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <SkeletonBase style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <SkeletonBase style={{ width: '50%', height: 14, marginBottom: 6 }} />
        <SkeletonBase style={{ width: '30%', height: 10 }} />
      </div>
    </div>
    <SkeletonBase style={{ width: '100%', height: 60, marginBottom: '12px' }} />
    <div style={{ display: 'flex', gap: '8px' }}>
      <SkeletonBase style={{ width: 48, height: 48, borderRadius: '10px' }} />
      <SkeletonBase style={{ width: 48, height: 48, borderRadius: '10px' }} />
      <SkeletonBase style={{ width: 48, height: 48, borderRadius: '10px' }} />
    </div>
  </div>
);

// Skeleton para rutina
export const RoutineSkeleton = () => (
  <div style={{ 
    background: 'var(--surface-1)',
    borderRadius: '12px', 
    padding: '14px',
    marginBottom: '8px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <SkeletonBase style={{ width: '60%', height: 16 }} />
      <SkeletonBase style={{ width: 24, height: 24, borderRadius: '50%' }} />
    </div>
    <SkeletonBase style={{ width: '80%', height: 12 }} />
  </div>
);

// Lista de skeletons
export const SkeletonList = ({ count, type = 'exercise' }) => {
  const Component = type === 'post' ? PostSkeleton : 
                    type === 'routine' ? RoutineSkeleton : ExerciseSkeleton;
  
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </>
  );
};

export default SkeletonBase;
