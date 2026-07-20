"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/tables/data-table";
import { useI18n } from "@/components/i18n/i18n-provider";
import { expertTypeLabels } from "@/lib/constants";
import type { ExpertListItem } from "@/server/repositories/expert-repository";

export function ExpertTable({ rows }: { rows: ExpertListItem[] }) {
  const { dictionary: t } = useI18n();
  const columns = useMemo<ColumnDef<ExpertListItem>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t.experts.tableExpert,
        cell: ({ row }) => (
          <div>
            <Link href={`/experts/${row.original.id}`} className="font-semibold text-primary hover:underline">
              {row.original.fullName}
            </Link>
            <div className="mt-1 text-xs text-muted-foreground">{t.labels.expertTypes[row.original.type] ?? expertTypeLabels[row.original.type]}</div>
          </div>
        )
      },
      {
        accessorKey: "isAvailable",
        header: t.experts.availability,
        cell: ({ row }) =>
          row.original.isAvailable ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{t.experts.available}</Badge>
          ) : (
            <Badge className="border-slate-200 bg-slate-50 text-slate-700">{t.experts.unavailable}</Badge>
          )
      },
      {
        accessorKey: "currentLoad",
        header: t.experts.load,
        cell: ({ row }) => {
          const percent = (row.original.currentLoad / row.original.maxActiveRequests) * 100;
          return (
            <div className="min-w-36">
              <div className="mb-1 text-xs text-muted-foreground">
                {row.original.currentLoad}/{row.original.maxActiveRequests}
              </div>
              <Progress value={percent} />
            </div>
          );
        }
      },
      {
        accessorKey: "rating",
        header: t.experts.rating,
        cell: ({ row }) => Number(row.original.rating).toFixed(1)
      },
      {
        accessorKey: "completedRequestsCount",
        header: t.experts.completed
      },
      {
        accessorKey: "skillNames",
        header: t.experts.skills,
        cell: ({ row }) => (
          <div className="flex max-w-md flex-wrap gap-1">
            {row.original.skillNames.slice(0, 4).map((skill) => (
              <span key={skill} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>
        )
      }
    ],
    [t]
  );

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <DataTable columns={columns} data={rows} emptyTitle={t.experts.emptyTitle} emptyText={t.experts.emptyText} />
        ) : rows.map((expert) => {
          const loadPercent = (expert.currentLoad / expert.maxActiveRequests) * 100;
          return (
            <Link
              key={expert.id}
              href={`/experts/${expert.id}`}
              className="focus-ring rounded-lg border bg-surface p-4 shadow-card transition hover:border-ring/40 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">{expert.fullName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.labels.expertTypes[expert.type] ?? expertTypeLabels[expert.type]}</div>
                </div>
                <Badge className={expert.isAvailable
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}>
                  {expert.isAvailable ? t.experts.available : t.experts.unavailable}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{t.experts.load}</span>
                  <span>{expert.currentLoad}/{expert.maxActiveRequests}</span>
                </div>
                <Progress value={loadPercent} tone={loadPercent >= 100 ? "danger" : loadPercent >= 80 ? "warning" : "default"} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{t.experts.rating}: {Number(expert.rating).toFixed(1)}</span>
                <span>{t.experts.completed}: {expert.completedRequestsCount}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          emptyTitle={t.experts.emptyTitle}
          emptyText={t.experts.emptyText}
        />
      </div>
    </>
  );
}
