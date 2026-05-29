import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ColumnInfo } from '../types';

interface DataPreviewGridProps {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  loading?: boolean;
}

export function DataPreviewGrid({ columns, rows, loading }: DataPreviewGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(5);

  const columnDefs = useMemo<ColumnDef<Record<string, any>>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: (info) => {
        const value = info.getValue();
        if (value === null || value === undefined) {
          return <span className="text-gray-400 dark:text-slate-500">null</span>;
        }
        return String(value);
      },
      enableSorting: true,
    }));
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: {
      sorting,
      globalFilter,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: true,
    enableGlobalFilter: true,
  });

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input-field pl-9"
            placeholder="Search rows..."
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span>{rows.length} rows</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.map((col) => (
          <div
            key={col.name}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1 text-xs dark:bg-slate-700/50"
          >
            <span className="font-medium text-gray-700 dark:text-slate-300">{col.name}</span>
            <span className="text-gray-400 dark:text-slate-500">{col.type}</span>
            <span className={`rounded px-1 py-0.5 ${col.nullPercentage > 10 ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-slate-400'}`}>
              {col.nullPercentage}% null
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="h-3.5 w-3.5" />,
                        desc: <ChevronDown className="h-3.5 w-3.5" />,
                      }[header.column.getIsSorted() as string] ?? (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-500 dark:text-slate-400"
                >
                  No data to display
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-800/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-gray-700 dark:text-slate-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {[1, 5, 10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
