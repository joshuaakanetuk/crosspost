import { useState, useMemo } from 'react'
import Table, { TableData, TableColumn } from '../components/Table'
import AddItemModal, { AddItemFormData } from '../components/AddItemModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
    
// Define your data type
interface Media {
  id: string
  url: string
  type: string
  inventoryId: string
}

interface InventoryItem extends TableData {
  id?: string
  name: string
  description?: string
  quantity: number
  price: number
  media: Media[]
  location: string
  lastModified: string
}

// Example usage in your Inventory component
export default function Inventory() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [originalMedia, setOriginalMedia] = useState<Media[]>([])
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => fetch('http://localhost:3000/api/inventory').then(res => res.json()),
  })

  const addItemMutation = useMutation({
    mutationFn: (newItem: InventoryItem) => 
      fetch('http://localhost:3000/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setShowAddModal(false)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: async (updatedItem: InventoryItem) => {
      // 1. Update basic inventory fields (without media)
      const { media, ...inventoryFields } = updatedItem
      const inventoryResponse = await fetch(`http://localhost:3000/api/inventory/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryFields),
      }).then(res => res.json())

      // 2. Handle media changes
      if (media) {
        // Find deleted media by comparing original with current
        const currentUrls = media.map(m => m.url)
        const deletedMedia = originalMedia.filter(m => !currentUrls.includes(m.url))

        // Delete removed media
        for (const mediaItem of deletedMedia) {
          await fetch(`http://localhost:3000/api/media/${mediaItem.id}`, {
            method: 'DELETE',
          })
        }

        // Filter only new data URLs (not existing S3 URLs)
        const newDataUrls = media.map(m => m.url).filter(url => url.startsWith('data:'))

        // Append new media
        if (newDataUrls.length > 0) {
          await fetch(`http://localhost:3000/api/inventory/${updatedItem.id}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ media: newDataUrls }),
          }).then(res => res.json())
        }
      }

      return inventoryResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setEditingItem(null)
      setOriginalMedia([])
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      fetch(`http://localhost:3000/api/inventory/${itemId}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })

  const handleAddItem = (formData: AddItemFormData) => {
    const mediaObjects = formData.media.map((url, index) => ({
      id: `media-${Date.now()}-${index}`,
      url: url,
      type: 'image',
      inventoryId: formData.id || '',
    }))

    const newItem: InventoryItem = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      quantity: formData.quantity,
      price: formData.price,
      location: formData.location,
      media: mediaObjects,
      lastModified: formData.lastModified || new Date().toISOString(),
    }

    if (editingItem) {
      updateItemMutation.mutate(newItem)
    } else {
      addItemMutation.mutate(newItem)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && items) {
      // Select all items
      setSelectedItems(new Set(items.map((item: InventoryItem) => item.id).filter((id: string | undefined): id is string => id !== undefined)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const allSelected = items && items.length > 0 && items.every((item: InventoryItem) => item.id !== undefined && selectedItems.has(item.id as string))
  const someSelected = items && items.some((item: InventoryItem) => item.id !== undefined && selectedItems.has(item.id as string))

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setOriginalMedia(item.media || [])
    setShowAddModal(true)
  }

  const handleDeleteItem = (item: InventoryItem) => {
    if (item.id && window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      deleteItemMutation.mutate(item.id)
    }
  }

  const convertItemToFormData = (item: InventoryItem): AddItemFormData => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      location: item.location,
      media: item.media?.map(m => m.url) || [],
      lastModified: item.lastModified,
    }
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setEditingItem(null)
    setOriginalMedia([])
  }

  const columns: TableColumn<InventoryItem>[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      type: 'checkbox',
      width: 50,
      accessor: () => null,
      sortable: false,
      checkboxProps: {
        checked: (item) => item.id !== undefined && selectedItems.has(item.id),
        onChange: (item, checked) => {
          if (item.id !== undefined) {
            setSelectedItems(prev => {
              const newSelected = new Set(prev)
              if (checked) {
                newSelected.add(item.id as string)
              } else {
                newSelected.delete(item.id as string)
              }
              return newSelected
            })
          }
        },
      },
    },
    {
      key: 'media',
      header: 'Image',
      width: 80,
      accessor: (item) => item.media && item.media.length > 0 ? (
        <img
          src={item.media[0].url}
          alt={item.name}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      accessor: (item) => (
        <div className="max-w-xs truncate" title={item.description || ''}>
          {item.description || '-'}
        </div>
      ),
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
      key: 'actions',
      header: 'Actions',
      width: 120,
      cellClassName: 'space-x-2',
      sortable: false,
      accessor: (item) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditItem(item)
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteItem(item)
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ),
    }
  ], [selectedItems, handleEditItem, handleDeleteItem])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Inventory Management</h1>

        {/* Selection controls */}
        <div className="mb-4 p-4 bg-white rounded-lg shadow flex items-center gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Select All Items</span>
            </label>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="flex-1" />
        </div>

        {items && !isLoading ? (
          <Table
            data={items || []}
            columns={columns}
            enableSorting={true}
            enablePagination={true}
            pageSize={10}
            className="shadow-lg"
          />
        ) : null}
        
        <AddItemModal
          open={showAddModal}
          onClose={handleModalClose}
          onSubmit={handleAddItem}
          initialData={editingItem ? convertItemToFormData(editingItem) : undefined}
          isEditing={!!editingItem}
        />
        
        <div className="mt-2 p-2 bg-white rounded-lg shadow-sm text-sm text-gray-500 text-right">
          Selected: {selectedItems.size} of {items?.length || 0} items
        </div>
      </div>
    </div>
  )
}