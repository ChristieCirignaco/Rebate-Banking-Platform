import {
  FormSkeleton,
  PageShellSkeleton,
} from "@/components/app/skeletons/page-skeleton";

// Mirrors app/(app)/deposit/page.tsx: shell header, then DepositForm's three always-present
// controls — wallet, payment method, amount — and the submit. The method's credential fields and
// the fee summary only appear once a method/amount is chosen, so they're not reserved here.
export default function Loading() {
  return (
    <PageShellSkeleton>
      <FormSkeleton fields={3} />
    </PageShellSkeleton>
  );
}
