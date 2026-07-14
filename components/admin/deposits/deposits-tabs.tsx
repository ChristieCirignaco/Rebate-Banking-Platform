"use client";

import { Banknote, ClipboardList, History, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositHistoryTab } from "./deposit-history-tab";
import { ManualRequestsTab } from "./manual-requests-tab";
import { MethodsTab } from "./methods-tab";
import type {
  CurrencyOption,
  DepositHistory,
  DepositMethod,
  DepositRequest,
  GatewayOption,
} from "./types";

export function DepositsTabs({
  requests,
  autoMethods,
  manualMethods,
  history,
  currencies,
  gateways,
}: {
  requests: DepositRequest[];
  autoMethods: DepositMethod[];
  manualMethods: DepositMethod[];
  history: DepositHistory[];
  currencies: CurrencyOption[];
  gateways: GatewayOption[];
}) {
  return (
    <Tabs defaultValue="requests" className="gap-4">
      <div className="w-full overflow-x-auto pb-2 -mb-2">
        <TabsList className="w-max justify-start">
        <TabsTrigger value="requests">
          <ClipboardList className="size-4" />
          Manual Requests
          {requests.length > 0 ? (
            <Badge variant="secondary" className="ml-1 px-1.5">
              {requests.length}
            </Badge>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="auto">
          <Zap className="size-4" />
          Automatic Methods
        </TabsTrigger>
        <TabsTrigger value="manual">
          <Banknote className="size-4" />
          Manual Methods
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="size-4" />
          Deposit History
        </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="requests" forceMount className="data-[state=inactive]:hidden">
        <ManualRequestsTab requests={requests} />
      </TabsContent>
      <TabsContent value="auto" forceMount className="data-[state=inactive]:hidden">
        <MethodsTab
          methodType="auto"
          methods={autoMethods}
          currencies={currencies}
          gateways={gateways}
        />
      </TabsContent>
      <TabsContent value="manual" forceMount className="data-[state=inactive]:hidden">
        <MethodsTab
          methodType="manual"
          methods={manualMethods}
          currencies={currencies}
          gateways={gateways}
        />
      </TabsContent>
      <TabsContent value="history" forceMount className="data-[state=inactive]:hidden">
        <DepositHistoryTab history={history} />
      </TabsContent>
    </Tabs>
  );
}
