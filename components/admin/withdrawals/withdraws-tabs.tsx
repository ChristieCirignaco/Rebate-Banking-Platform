"use client";

import { Banknote, CalendarClock, ClipboardList, History, Zap } from "lucide-react";

import type { WithdrawHistoryResult } from "@/lib/admin/withdrawals";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithdrawHistoryTab } from "./withdraw-history-tab";
import { WithdrawMethodsTab } from "./withdraw-methods-tab";
import { WithdrawRequestsTab } from "./withdraw-requests-tab";
import { WithdrawScheduleTab } from "./withdraw-schedule-tab";
import type {
  CurrencyOption,
  GatewayOption,
  WithdrawMethod,
  WithdrawRequest,
  WithdrawScheduleDay,
} from "./types";

export function WithdrawsTabs({
  requests,
  autoMethods,
  manualMethods,
  schedule,
  history,
  currencies,
  gateways,
}: {
  requests: WithdrawRequest[];
  autoMethods: WithdrawMethod[];
  manualMethods: WithdrawMethod[];
  schedule: WithdrawScheduleDay[];
  history: WithdrawHistoryResult;
  currencies: CurrencyOption[];
  gateways: GatewayOption[];
}) {
  return (
    <Tabs defaultValue="requests" className="gap-4">
      <TabsList className="w-full justify-start overflow-x-auto">
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
        <TabsTrigger value="schedule">
          <CalendarClock className="size-4" />
          Scheduled Withdraws
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="size-4" />
          Withdraws History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="requests">
        <WithdrawRequestsTab requests={requests} />
      </TabsContent>
      <TabsContent value="auto">
        <WithdrawMethodsTab
          methodType="auto"
          methods={autoMethods}
          currencies={currencies}
          gateways={gateways}
        />
      </TabsContent>
      <TabsContent value="manual">
        <WithdrawMethodsTab
          methodType="manual"
          methods={manualMethods}
          currencies={currencies}
          gateways={gateways}
        />
      </TabsContent>
      <TabsContent value="schedule">
        <WithdrawScheduleTab schedule={schedule} />
      </TabsContent>
      <TabsContent value="history">
        <WithdrawHistoryTab initial={history} />
      </TabsContent>
    </Tabs>
  );
}
