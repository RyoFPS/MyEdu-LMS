import { Skeleton } from '../ui/skeleton';
import { Card, CardContent } from '../ui/card';

interface CardGridSkeletonProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({ count = 6, columns = 3 }) => {
  const gridClass = columns === 1 ? '' : columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4';
  
  return (
    <div className={`grid grid-cols-1 ${gridClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
