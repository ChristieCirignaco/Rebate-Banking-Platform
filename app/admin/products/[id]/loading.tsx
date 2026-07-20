import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminSectionSkeleton,
  DetailSkeleton,
  FormSkeleton,
} from "@/components/admin/skeletons/admin-skeleton";

// Product editor: details form + image panel on the left, status and metadata cards on the right.
export default function Loading() {
  return (
    <AdminSectionSkeleton description={false} action>
      <DetailSkeleton
        main={
          <>
            <FormSkeleton fields={6} />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-44" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full rounded-lg" />
              </CardContent>
            </Card>
          </>
        }
        aside={
          <>
            <FormSkeleton fields={2} />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        }
      />
    </AdminSectionSkeleton>
  );
}
