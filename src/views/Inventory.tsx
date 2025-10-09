import { useState } from 'react'
import Table, { TableData, TableColumn } from '../components/Table'

// Define your data type
interface InventoryItem extends TableData {
  id: number
  name: string
  category: string
  quantity: number
  price: number
  status: 'active' | 'inactive'
}

// Example usage in your Inventory component
export default function Inventory() {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  const sampleData: InventoryItem[] = [
    { id: 1, name: 'Camera A', category: 'Electronics', quantity: 5, price: 299.99, status: 'active' },
    { id: 2, name: 'Camera B', category: 'Electronics', quantity: 3, price: 199.99, status: 'active' },
    { id: 3, name: 'Tripod', category: 'Accessories', quantity: 10, price: 49.99, status: 'inactive' },
  ]

  const handleCheckboxChange = (item: InventoryItem, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(item.id)
    } else {
      newSelected.delete(item.id)
    }
    setSelectedItems(newSelected)
  }

  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'select',
      header: '',
      type: 'checkbox',
      width: 50,
      checkboxProps: {
        disabled: (item) => item.status !== 'active',
        onChange: handleCheckboxChange,
      },
    },
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      cellClassName: 'text-center',
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      cellClassName: 'text-right',
      accessor: (item) => `$${item.price.toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cellClassName: (item) => item.status === 'active' ? 'text-green-600' : 'text-red-600',
    },
  ]
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Inventory Management</h1>

        {/* Selection info */}
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">
            Selected items: {selectedItems.size > 0 ? Array.from(selectedItems).join(', ') : 'None'}
          </p>
          <p className="text-sm text-gray-600">
            Total selected: {selectedItems.size}
          </p>
        </div>

        <Table
          data={sampleData}
          columns={columns}
          enableSorting={true}
          enablePagination={true}
          onRowClick={(row) => console.log('Clicked row:', row)}
          className="shadow-lg"
        />
      </div>
    </div>
  )
}