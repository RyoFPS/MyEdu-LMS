import { Skeleton } from '../ui/skeleton';
import { Card, CardContent } from '../ui/card';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    {/* Main content */}
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  </div>
);
