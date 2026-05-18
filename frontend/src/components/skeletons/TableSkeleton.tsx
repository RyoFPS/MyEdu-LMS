import { Skeleton } from '../ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 5 }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {Array.from({ length: columns }).map((_, i) => (
          <TableHead key={i}>
            <Skeleton className="h-4 w-20" />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
