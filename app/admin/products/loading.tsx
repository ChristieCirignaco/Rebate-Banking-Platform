import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level fallback shown while the server component fetches the list.
export default function Loading() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Card className="flex flex-col gap-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="size-12 rounded-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
