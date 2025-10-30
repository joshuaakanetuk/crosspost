import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    ColumnDef,
    SortingState,
    ColumnFiltersState, 
  } from '@tanstack/react-table'
  import { useState, useMemo, ReactNode } from 'react'
  

export interface TableData {
  id?: string | number
  [key: string]: any
}


export interface TableColumn<T extends TableData> {
  key: keyof T | string
  header: string
  accessor?: (item: T) => any
  sortable?: boolean
  filterable?: boolean
  width?: number
  className?: string
  headerClassName?: string
  cellClassName?: string | ((item: T) => string)
  type?: 'default' | 'checkbox'
  checkboxProps?: {
    disabled?: (item: T) => boolean
    checked?: (item: T) => boolean
    onChange?: (item: T, checked: boolean) => void
  }
}

export interface TableProps<T extends TableData> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  error?: string | null
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  pageSize?: number
  className?: string
  emptyMessage?: string
  onRowClick?: (row: T) => void
  getRowProps?: (row: T) => React.HTMLAttributes<HTMLTableRowElement>
}
  
  // Generic Table Component
  export default function Table<T extends TableData>({
    data,
    columns,
    loading = false,
    error = null,
    enableSorting = true,
    enableFiltering = false,
    enablePagination = false,
    pageSize = 10,
    className = '',
    emptyMessage = 'No data available',
    onRowClick,
    getRowProps,
  }: TableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: pageSize,
    })
  
    const tableColumns = useMemo<ColumnDef<T>[]>(() => {
      return columns.map((col) => ({
        id: String(col.key),
        accessorFn: col.accessor || (col.type === 'checkbox' ? () => null : ((item: T) => item[col.key])),
        enableSorting: col.sortable !== false && enableSorting,
        enableColumnFilter: col.filterable && enableFiltering,
        size: col.width,
        cell: ({ getValue, row }) => {
          const value = getValue()
          const column = col
          const cellClassName = column?.cellClassName

          if (column?.type === 'checkbox') {
            const isDisabled = column.checkboxProps?.disabled?.(row.original) ?? false
            const isChecked = column.checkboxProps?.checked?.(row.original) ?? false
            return (
              <div onClick={(e) => {
                e.stopPropagation()
              }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    column.checkboxProps?.onChange?.(row.original, e.target.checked)
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
              </div>
            )
          }

          return (
            <div className={typeof cellClassName === 'function' ? cellClassName(row.original) : cellClassName}>
              {value as ReactNode}
            </div>
          )
        },
        header: () => (
          <div className={`${col.headerClassName} ${col.sortable !== false && enableSorting ? 'cursor-pointer select-none' : ''}`}>
            {col.header}
          </div>
        ),
      }))
    }, [columns, enableSorting, enableFiltering])
  
    const table = useReactTable({
      data,
      columns: tableColumns,
      getCoreRowModel: getCoreRowModel(),
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onPaginationChange: setPagination,
      getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
      getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
      getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
      getRowId: (row) => row.id?.toString() || Math.random().toString(),
      state: {
        sorting,
        columnFilters,
        pagination,
      },
      manualPagination: false,
    })
  
    if (loading) {
      return (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )
    }
  
    if (error) {
      return (
        <div className={`flex items-center justify-center p-8 text-red-600 ${className}`}>
          <span>Error: {error}</span>
        </div>
      )
    }
  
    return (
      <div className={`w-full ${className}`}>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${columns.find(col => String(col.key) === header.id)?.headerClassName || ''}`}
                      style={{
                        width: columns.find(col => String(col.key) === header.id)?.width,
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="ml-1">
                              {header.column.getIsSorted() === 'asc' && '↑'}
                              {header.column.getIsSorted() === 'desc' && '↓'}
                              {header.column.getIsSorted() !== 'asc' && header.column.getIsSorted() !== 'desc' && '↕'}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rowProps = getRowProps ? getRowProps(row.original) : {}
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${rowProps.className || ''}`}
                      onClick={() => onRowClick?.(row.original)}
                      {...rowProps}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const column = columns.find(col => String(col.key) === cell.column.id)
                        const isCheckboxCell = column?.type === 'checkbox'
                        return (
                          <td
                            key={cell.id}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${(() => {
                              const cellClassName = column?.cellClassName
                              if (typeof cellClassName === 'function') {
                                return cellClassName(row.original)
                              }
                              return cellClassName || ''
                            })()}`}
                            onClick={(e) => {
                              if (isCheckboxCell) {
                                e.stopPropagation()
                              }
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
  
        {enablePagination && table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="flex items-center">
              <button
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <div className="flex items-center mx-4">
                <span className="text-sm text-gray-700">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
              </div>
              <button
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="block px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    Show {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    )
  }