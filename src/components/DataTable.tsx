'use client'

import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
} from 'lucide-react'
import { useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Service } from '@/lib/docker'

import { Button } from './ui/button'
import { Input } from './ui/input'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void
}

export function SortButton({
  column,
  children,
  alignRight,
}: {
  column: Column<any, any>
  children: React.ReactNode
  alignRight?: boolean
}) {
  const arrow =
    column.getIsSorted() === 'asc' ? (
      <ArrowUpNarrowWide className="h-4 w-4" />
    ) : column.getIsSorted() === 'desc' ? (
      <ArrowDownWideNarrow className="h-4 w-4" />
    ) : (
      <ArrowUpDown className="opacity-0 group-hover:opacity-100 h-4 w-4" />
    )
  return (
    <Button
      variant="ghost"
      className="-mx-4 gap-2"
      onClick={() => column.toggleSorting()}
    >
      {alignRight && arrow}
      {children}
      {!alignRight && arrow}
    </Button>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Filter services..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="group">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} onClick={onRowClick}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  style={
                    (row.original as Service).Spec.Labels?.['hive.tint']
                      ? {
                          backgroundColor: `hsla(${
                            (row.original as Service).Spec.Labels['hive.tint']
                          }, 100%, 50%, 7%)`,
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
