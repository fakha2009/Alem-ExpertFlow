"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { useI18n } from "@/components/i18n/i18n-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyTitle,
  emptyText,
  className
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyTitle?: string;
  emptyText?: string;
  className?: string;
}) {
  const { dictionary } = useI18n();
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally returns table state helpers.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? dictionary.dataTable.emptyTitle}
        text={emptyText ?? dictionary.dataTable.emptyText}
      />
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-surface shadow-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-elevated text-xs uppercase tracking-normal text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-4 py-3.5 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/35">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
