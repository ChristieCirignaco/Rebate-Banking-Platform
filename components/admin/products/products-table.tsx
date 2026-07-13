import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductTableRow } from "./product-table-row";
import type { ProductSubmission } from "./types";

export function ProductsTable({
  products,
}: {
  products: ProductSubmission[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User / Product</TableHead>
          <TableHead>Image</TableHead>
          <TableHead>Price / Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-muted-foreground h-24 text-center"
            >
              No product submissions match your filters.
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => (
            <ProductTableRow key={product.id} product={product} />
          ))
        )}
      </TableBody>
    </Table>
  );
}
