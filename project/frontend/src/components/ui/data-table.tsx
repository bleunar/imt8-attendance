"use client"

import * as React from "react"
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    type SortingState,
    getSortedRowModel,
    type ColumnFiltersState,
    getFilteredRowModel,
    type OnChangeFn,
    type RowSelectionState, // Added
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    isLoading?: boolean
    pagination?: {
        currentPage: number
        totalPages: number
        onPageChange: (page: number) => void
    }
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
    rowSelection?: RowSelectionState
    onRowSelectionChange?: OnChangeFn<RowSelectionState>
    meta?: any
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading,
    pagination,
    sorting: controlledSorting,
    onSortingChange: controlledOnSortingChange,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: controlledOnRowSelection,
    meta
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({}) // Internal state if needed

    const table = useReactTable({
        data,
        columns,
        meta,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: controlledOnSortingChange || setSorting, // Use controlled or internal
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        manualPagination: !!pagination,
        pageCount: pagination?.totalPages,
        manualSorting: !!controlledSorting, // Enable manual sorting if specific
        onRowSelectionChange: controlledOnRowSelection || setRowSelection,
        state: {
            sorting: controlledSorting || sorting,
            columnFilters,
            rowSelection: controlledRowSelection || rowSelection,
        },
    })

    return (
        <div className="w-full">
            <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
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
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination ? pagination.onPageChange(pagination.currentPage - 1) : table.previousPage()}
                    disabled={pagination ? pagination.currentPage <= 1 : !table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                {pagination && (
                    <div className="text-sm text-slate-500">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination ? pagination.onPageChange(pagination.currentPage + 1) : table.nextPage()}
                    disabled={pagination ? pagination.currentPage >= pagination.totalPages : !table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
