import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GatewayTableRow } from "./gateway-table-row";
import type { PaymentGatewayView } from "./types";

export function GatewayTable({
  gateways,
}: {
  gateways: PaymentGatewayView[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Logo</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Supported Currencies</TableHead>
          <TableHead>Withdraw Available</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gateways.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-muted-foreground h-24 text-center"
            >
              No payment gateways configured.
            </TableCell>
          </TableRow>
        ) : (
          gateways.map((gateway) => (
            <GatewayTableRow key={gateway.id} gateway={gateway} />
          ))
        )}
      </TableBody>
    </Table>
  );
}
