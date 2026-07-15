"use client";

import { useState } from "react";
import { History, Search, SearchCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { DateRangeSelect, EmptyState } from "../shared";
import type { ActivityEntry } from "../types";

export function UserActivityTab({ activity }: { activity: ActivityEntry[] }) {
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");

  const filtered = activity.filter((entry) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [entry.ip, entry.country, entry.browser, entry.os].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DateRangeSelect value={range} onChange={setRange} />
        <div className="flex gap-2 sm:w-72">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search IP, country, browser…"
            aria-label="Search activity"
          />
          <Button size="icon" variant="secondary" aria-label="Search">
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity found"
            description="No login history in the selected range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Login Time</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Browser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm whitespace-nowrap">
                        {formatDateTime(entry.loginAt)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(entry.loginAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm">{entry.ip}</span>
                      {entry.ip && entry.ip !== "—" ? (
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          title="Look up IP on IPinfo"
                        >
                          <a
                            href={`https://ipinfo.io/${entry.ip}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Look up ${entry.ip} on IPinfo`}
                          >
                            <SearchCode className="size-3.5" />
                            <span className="sr-only">Look up IP on IPinfo</span>
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.country}</span>
                      {entry.org ? (
                        <span className="text-muted-foreground text-xs">{entry.org}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.browser}</span>
                      <span className="text-muted-foreground text-xs">
                        {entry.os}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
