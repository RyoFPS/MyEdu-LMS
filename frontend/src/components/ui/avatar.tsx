import React from 'react';
import { cn, getInitials } from '../../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const colorPalette = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

/**
 * Resolve avatar URL — prepend backend host for /storage/ paths.
 */
function resolveAvatarUrl(src: string): string {
  if (src.startsWith('/storage/')) {
    // Use the same hostname as the current page, port 8000 (backend)
    const backendHost = `http://${window.location.hostname}:8000`;
    return `${backendHost}${src}`;
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return src;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = '',
  size = 'md',
  className,
  ...props
}) => {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  if (src && !imgError) {
    const resolvedSrc = resolveAvatarUrl(src);
    return (
      <div
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-full',
          avatarSizes[size],
          className
        )}
        {...props}
      >
        <img
          src={resolvedSrc}
          alt={alt || name}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        avatarSizes[size],
        bgColor,
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
};
