import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminSectionSkeleton,
  DetailSkeleton,
  FormSkeleton,
} from "@/components/admin/skeletons/admin-skeleton";

// Compose form on the left, recipient/preview panel on the right.
export default function Loading() {
  return (
    <AdminSectionSkeleton>
      <DetailSkeleton
        main={<FormSkeleton fields={4} />}
        aside={
          <Card className="h-fit">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        }
      />
    </AdminSectionSkeleton>
  );
}
