import React from 'react';
import ReactDOM from 'react-dom';
import { cn, getInitials } from '../../lib/utils';
import { X } from 'lucide-react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  previewable?: boolean;
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

function resolveAvatarUrl(src: string): string {
  if (src.startsWith('/storage/')) {
    const backendHost = `http://${window.location.hostname}:8000`;
    return `${backendHost}${src}`;
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return src;
}

// Preview modal rendered via Portal
const AvatarPreviewModal: React.FC<{
  src: string;
  name: string;
  alt?: string;
  onClose: () => void;
}> = ({ src, name, alt, onClose }) => {
  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Photo */}
        <div className="bg-gray-100 dark:bg-gray-900">
          <img
            src={src}
            alt={alt || name}
            className="w-full h-auto max-h-[60vh] object-contain"
          />
        </div>

        {/* Name bar */}
        {name && (
          <div className="px-4 py-3 text-center border-t border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
              {name}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = '',
  size = 'md',
  previewable = false,
  className,
  onClick,
  ...props
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  const resolvedSrc = src && !imgError ? resolveAvatarUrl(src) : null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(e);
    } else if (previewable && resolvedSrc) {
      e.stopPropagation();
      e.preventDefault();
      setShowPreview(true);
    }
  };

  const isClickable = previewable && resolvedSrc;

  return (
    <>
      {resolvedSrc ? (
        <div
          className={cn(
            'relative inline-flex shrink-0 overflow-hidden rounded-full',
            avatarSizes[size],
            isClickable && 'cursor-pointer ring-0 hover:ring-2 hover:ring-primary-500/50 transition-all',
            className
          )}
          onClick={handleClick}
          {...props}
        >
          <img
            src={resolvedSrc}
            alt={alt || name}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div
          className={cn(
            'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
            avatarSizes[size],
            bgColor,
            className
          )}
          onClick={onClick}
          {...props}
        >
          {initials}
        </div>
      )}

      {/* Preview Modal — rendered via Portal at document.body */}
      {showPreview && resolvedSrc && (
        <AvatarPreviewModal
          src={resolvedSrc}
          name={name}
          alt={alt}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};
