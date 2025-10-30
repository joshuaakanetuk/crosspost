import { useState, useMemo } from 'react'
import Table, { TableData, TableColumn } from '../components/Table'
import CreateListingModal, { ListingFormData } from '../components/CreateListingModal'
import EditListingModal from '../components/EditListingModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Define types
interface Media {
  id: string
  url: string
  type: string
  inventoryId: string
}

interface InventoryItem {
  id: string
  name: string
  description?: string
  quantity: number
  price: number
  location: string
  media: Media[]
}

interface MarketplaceListing {
  id: string
  listingId: string
  marketplace: string
  marketplaceListingId?: string
  marketplaceUrl?: string
  marketplaceStatus: string
  price?: number
  createdAt: string
  updatedAt: string
}

interface Listing extends TableData {
  id: string
  inventoryId: string
  inventory: InventoryItem
  status: string
  listingName: string
  listingDescription?: string
  condition?: string
  sku?: string
  tags?: string
  price: number
  compareAtPrice?: number
  auctionStartPrice?: number
  auctionReservePrice?: number
  currency: string
  quantityAvailable: number
  category?: string // JSON string: {"id": "123", "name": "Electronics"}
  itemSpecifics?: string
  shippingWeight?: number
  shippingLength?: number
  shippingWidth?: number
  shippingHeight?: number
  shippingService?: string
  shippingCost?: number
  freeShipping: boolean
  localPickupOnly: boolean
  shippingProfileId?: string
  marketplaceListings: MarketplaceListing[]
  publishDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

// Helper function to parse category JSON and extract name
const getCategoryName = (categoryJson: string | undefined): string => {
  if (!categoryJson) return ''
  try {
    const parsed = JSON.parse(categoryJson)
    return parsed.name || ''
  } catch {
    return ''
  }
}

export default function Listings() {
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: () => fetch('http://localhost:3000/api/listings').then(res => res.json()),
  })

  const createListingMutation = useMutation({
    mutationFn: (newListing: ListingFormData) =>
      fetch('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListing),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      setShowCreateModal(false)
    },
  })

  const updateListingMutation = useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: Partial<ListingFormData> }) =>
      fetch(`http://localhost:3000/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      setShowEditModal(false)
      setEditingListing(null)
    },
  })

  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) =>
      fetch(`http://localhost:3000/api/listings/${listingId}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const cancelScheduleMutation = useMutation({
    mutationFn: (listingId: string) =>
      fetch(`http://localhost:3000/api/listings/${listingId}/cancel-schedule`, {
        method: 'POST',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const publishNowMutation = useMutation({
    mutationFn: (listingId: string) =>
      fetch(`http://localhost:3000/api/listings/${listingId}/publish-now`, {
        method: 'POST',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const handleCreateListing = (listingData: ListingFormData) => {
    createListingMutation.mutate(listingData)
  }

  const handleEditListing = (listingId: string, data: Partial<ListingFormData>) => {
    updateListingMutation.mutate({ listingId, data })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && listings) {
      setSelectedListings(new Set(listings.map((listing: Listing) => listing.id)))
    } else {
      setSelectedListings(new Set())
    }
  }

  const allSelected = listings && listings.length > 0 && listings.every((listing: Listing) => selectedListings.has(listing.id))
  const someSelected = listings && listings.some((listing: Listing) => selectedListings.has(listing.id))

  const handleDeleteListing = (listing: Listing) => {
    if (window.confirm(`Are you sure you want to delete listing "${listing.listingName}"?`)) {
      deleteListingMutation.mutate(listing.id)
    }
  }

  const handleCancelSchedule = (listing: Listing) => {
    if (window.confirm(`Cancel scheduled publish for "${listing.listingName}"?`)) {
      cancelScheduleMutation.mutate(listing.id)
    }
  }

  const handlePublishNow = (listing: Listing) => {
    if (window.confirm(`Publish "${listing.listingName}" immediately?`)) {
      publishNowMutation.mutate(listing.id)
    }
  }

  const isScheduled = (listing: Listing) => {
    return listing.status === 'draft' && listing.publishDate && new Date(listing.publishDate) > new Date()
  }

  const getScheduleInfo = (listing: Listing) => {
    if (!listing.publishDate) return null
    const publishDate = new Date(listing.publishDate)
    const now = new Date()

    if (publishDate <= now) return null

    const diffMs = publishDate.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    let timeUntil = ''
    if (diffDays > 0) {
      timeUntil = `in ${diffDays}d ${diffHours % 24}h`
    } else if (diffHours > 0) {
      timeUntil = `in ${diffHours}h ${diffMins % 60}m`
    } else if (diffMins > 0) {
      timeUntil = `in ${diffMins}m`
    } else {
      timeUntil = 'soon'
    }

    return {
      date: publishDate.toLocaleString(),
      timeUntil
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      sold: 'bg-green-100 text-green-800',
      ended: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const columns: TableColumn<Listing>[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      type: 'checkbox',
      width: 50,
      accessor: () => null,
      sortable: false,
      checkboxProps: {
        checked: (listing) => selectedListings.has(listing.id),
        onChange: (listing, checked) => {
          setSelectedListings(prev => {
            const newSelected = new Set(prev)
            if (checked) {
              newSelected.add(listing.id)
            } else {
              newSelected.delete(listing.id)
            }
            return newSelected
          })
        },
      },
    },
    {
      key: 'image',
      header: 'Image',
      width: 80,
      accessor: (listing) => listing.inventory.media && listing.inventory.media.length > 0 ? (
        <img
          src={listing.inventory.media[0].url}
          alt={listing.listingName}
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
      key: 'listingName',
      header: 'Listing Name',
      sortable: true,
    },
    {
      key: 'inventory',
      header: 'Inventory Item',
      sortable: false,
      accessor: (listing) => listing.inventory.name,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (listing) => {
        const scheduleInfo = getScheduleInfo(listing)
        return (
          <div className="flex flex-col gap-2 items-start">
            <div className="flex justify-center w-full">
              {getStatusBadge(listing.status)}
            </div>
            {scheduleInfo && (
              <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span title={scheduleInfo.date} className="font-medium">{scheduleInfo.timeUntil}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'condition',
      header: 'Condition',
      sortable: true,
      accessor: (listing) => listing.condition || '-',
    },
    {
      key: 'category',
      header: 'Category',
      sortable: false,
      accessor: (listing) => {
        const categoryName = getCategoryName(listing.category)
        if (!categoryName) {
          return <span className="text-gray-400 text-xs">No category</span>
        }
        return (
          <span className="text-xs text-gray-700" title={categoryName}>
            {categoryName.length > 25 ? categoryName.substring(0, 25) + '...' : categoryName}
          </span>
        )
      },
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      cellClassName: 'text-right',
      accessor: (listing) => `$${listing.price.toFixed(2)}`,
    },
    {
      key: 'marketplaces',
      header: 'Marketplaces',
      sortable: false,
      accessor: (listing) => {
        if (!listing.marketplaceListings || listing.marketplaceListings.length === 0) {
          return <span className="text-gray-400 text-xs">None</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {listing.marketplaceListings.map(mp => {
              const statusColors: { [key: string]: string } = {
                pending: 'bg-gray-100 text-gray-700',
                active: 'bg-green-100 text-green-700',
                error: 'bg-red-100 text-red-700',
                sold: 'bg-blue-100 text-blue-700',
                ended: 'bg-yellow-100 text-yellow-700',
              }
              const bgColor = statusColors[mp.marketplaceStatus] || 'bg-indigo-50 text-indigo-700'

              return (
                <div key={mp.id} className="relative group">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${bgColor}`}>
                    {mp.marketplace}
                    {mp.marketplaceStatus === 'error' && ' ⚠️'}
                    {mp.marketplaceStatus === 'active' && mp.marketplaceUrl && ' ✓'}
                  </span>
                  {(mp.errorMessage || mp.marketplaceUrl) && (
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap max-w-xs">
                        {mp.errorMessage && (
                          <p className="text-red-300">Error: {mp.errorMessage}</p>
                        )}
                        {mp.marketplaceUrl && (
                          <a href={mp.marketplaceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                            View on {mp.marketplace}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      cellClassName: 'space-x-2',
      sortable: false,
      accessor: (listing) => {
        const scheduled = isScheduled(listing)
        return (
          <div className="flex space-x-1">
            {scheduled && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePublishNow(listing)
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Publish Now"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelSchedule(listing)
                  }}
                  className="text-orange-600 hover:text-orange-800"
                  title="Cancel Schedule"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingListing(listing)
                setShowEditModal(true)
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
                handleDeleteListing(listing)
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )
      },
    }
  ], [selectedListings])

  // Calculate scheduled listings count
  const scheduledCount = listings?.filter((l: Listing) => isScheduled(l)).length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Listings Management</h1>

        {/* Scheduled listings banner */}
        {scheduledCount > 0 && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                {scheduledCount} {scheduledCount === 1 ? 'listing' : 'listings'} scheduled for automatic publishing
              </p>
              <p className="text-xs text-indigo-700">The scheduler checks every minute and will automatically publish listings at their scheduled time.</p>
            </div>
          </div>
        )}

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
              <span className="text-sm font-medium">Select All Listings</span>
            </label>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Listing
            </button>
          </div>

          <div className="flex-1" />
        </div>

        {listings && !isLoading ? (
          <Table
            data={listings || []}
            columns={columns}
            enableSorting={true}
            enablePagination={true}
            pageSize={10}
            className="shadow-lg"
          />
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">Loading listings...</p>
          </div>
        )}

        <CreateListingModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateListing}
        />

        <EditListingModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingListing(null)
          }}
          onSubmit={handleEditListing}
          listing={editingListing}
        />

        <div className="mt-2 p-2 bg-white rounded-lg shadow-sm text-sm text-gray-500 text-right">
          Selected: {selectedListings.size} of {listings?.length || 0} listings
        </div>
      </div>
    </div>
  )
}
