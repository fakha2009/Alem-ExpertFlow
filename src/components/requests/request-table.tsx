"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/data-table";
import { useI18n } from "@/components/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";
import type { RequestListItem } from "@/server/repositories/request-repository";

export function RequestTable({ rows }: { rows: RequestListItem[] }) {
  const { locale, dictionary: t } = useI18n();
  const columns = useMemo<ColumnDef<RequestListItem>[]>(
    () => [
      {
        accessorKey: "publicId",
        header: "ID",
        cell: ({ row }) => (
          <Link href={`/requests/${row.original.id}`} className="whitespace-nowrap font-semibold text-primary hover:underline">
            {row.original.publicId}
          </Link>
        )
      },
      {
        accessorKey: "title",
        header: t.requests.tableRequest,
        cell: ({ row }) => (
          <div className="max-w-md">
            <div className="font-medium text-foreground">{row.original.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{row.original.category}</div>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: t.requests.tableStatus,
        cell: ({ row }) => <StatusBadge status={row.original.status} label={t.labels.statuses[row.original.status]} />
      },
      {
        accessorKey: "priority",
        header: t.requests.tablePriority,
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} label={t.labels.priorities[row.original.priority]} />
      },
      {
        accessorKey: "assignedExpertName",
        header: t.requests.tableAssignee,
        cell: ({ row }) => row.original.assignedExpertName ?? t.requests.unassigned
      },
      {
        accessorKey: "deadline",
        header: t.requests.tableDeadline,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.deadline, locale, t.common.notSet)}</span>
      },
      {
        accessorKey: "commentsCount",
        header: t.requests.tableComments,
        cell: ({ row }) => row.original.commentsCount
      }
    ],
    [locale, t]
  );

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <DataTable columns={columns} data={rows} emptyTitle={t.requests.emptyTitle} emptyText={t.requests.emptyText} />
        ) : rows.map((request) => (
          <Link
            key={request.id}
            href={`/requests/${request.id}`}
            className="focus-ring rounded-lg border bg-surface p-4 shadow-card transition hover:border-ring/40 hover:bg-muted/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-primary">{request.publicId}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{request.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{request.category}</div>
              </div>
              <PriorityBadge priority={request.priority} label={t.labels.priorities[request.priority]} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} label={t.labels.statuses[request.status]} />
              <span className="text-xs text-muted-foreground">
                {t.requests.tableDeadline}: {formatDate(request.deadline, locale, t.common.notSet)}
              </span>
            </div>
            <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              {t.requests.tableAssignee}: {request.assignedExpertName ?? t.requests.unassigned}
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          emptyTitle={t.requests.emptyTitle}
          emptyText={t.requests.emptyText}
        />
      </div>
    </>
  );
}
