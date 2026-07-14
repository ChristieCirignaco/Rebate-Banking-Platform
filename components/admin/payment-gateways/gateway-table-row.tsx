import { TableCell, TableRow } from "@/components/ui/table";
import { GatewayLogo } from "./gateway-logo";
import { ManageGatewayDialog } from "./manage-gateway-dialog";
import { GatewayStatusBadge, WithdrawBadge } from "./payment-gateway-badges";
import { SupportedCurrencies } from "./supported-currencies";
import type { PaymentGatewayView } from "./types";

export function GatewayTableRow({ gateway }: { gateway: PaymentGatewayView }) {
  return (
    <TableRow>
      <TableCell>
        <GatewayLogo
          slug={gateway.slug}
          logo={gateway.logo}
          name={gateway.name}
          className="size-10"
        />
      </TableCell>
      <TableCell>
        <span className="font-medium whitespace-nowrap">{gateway.name}</span>
      </TableCell>
      <TableCell>
        <SupportedCurrencies currencies={gateway.supportedCurrencies} />
      </TableCell>
      <TableCell>
        <WithdrawBadge available={gateway.withdrawAvailable} />
      </TableCell>
      <TableCell>
        <GatewayStatusBadge status={gateway.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <ManageGatewayDialog gateway={gateway} />
        </div>
      </TableCell>
    </TableRow>
  );
}
