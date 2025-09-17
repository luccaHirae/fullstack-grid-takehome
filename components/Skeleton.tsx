interface SkeletonBlockProps {
  w?: number | string;
  h?: number | string;
  className?: string;
  rounded?: boolean;
  style?: React.CSSProperties;
}

export const SkeletonBlock = ({
  w = '100%',
  h = 16,
  className = '',
  rounded = true,
  style,
}: SkeletonBlockProps) => {
  const width = typeof w === 'number' ? `${w}px` : w;
  const height = typeof h === 'number' ? `${h}px` : h;
  return (
    <div
      className={`skeleton-base ${rounded ? '' : 'rounded-none'} ${className}`}
      style={{ width, height, ...style }}
    />
  );
};

export const SheetSkeleton = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      <div className='skeleton-toolbar'>
        <SkeletonBlock w={120} />
        <SkeletonBlock w={68} />
        <SkeletonBlock w={92} />
        <SkeletonBlock w={48} />
      </div>
      <div className='skeleton-formula'>
        <SkeletonBlock w={32} />
        <SkeletonBlock w='60%' />
      </div>
      <div
        className='skeleton-grid-wrapper'
        style={{ padding: 'var(--space-2)' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '4px',
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <SkeletonBlock key={i} h={28} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const InlineSkeleton = ({ lines = 3 }: { lines?: number }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} w={`${Math.max(30, 100 - i * 10)}%`} />
      ))}
    </div>
  );
};
