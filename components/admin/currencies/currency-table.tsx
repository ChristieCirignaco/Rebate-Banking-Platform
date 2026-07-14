import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyTableRow } from "./currency-table-row";
import type { CurrencyItem } from "./types";

export function CurrencyTable({
  currencies,
  defaultCode,
}: {
  currencies: CurrencyItem[];
  defaultCode: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Info</TableHead>
          <TableHead>Type / Rate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currencies.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-muted-foreground h-24 text-center"
            >
              No currencies yet. Add your first currency to get started.
            </TableCell>
          </TableRow>
        ) : (
          currencies.map((currency) => (
            <CurrencyTableRow
              key={currency.id}
              currency={currency}
              defaultCode={defaultCode}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
