import { useState } from 'react'

interface EbayItem {
  itemId: string
  title: string
  price: number | string
  currency: string
  condition: string
  imageUrl: string | null
  itemUrl: string
  seller: string
  categoryPath?: string
  categories?: any[]
  primaryCategory?: {
    id: string
    name: string
    path: string
  }
  categoryId?: string
}

interface EbaySearchModalProps {
  open: boolean
  onClose: () => void
  searchQuery: string
  onSelectItem: (item: EbayItem) => void
}

export default function EbaySearchModal({
  open,
  onClose,
  searchQuery,
  onSelectItem
}: EbaySearchModalProps) {
  const [results, setResults] = useState<EbayItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(
        `http://localhost:3000/api/ebay/search?query=${encodeURIComponent(searchQuery)}&limit=20`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to search eBay')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search eBay')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectItem = async (item: EbayItem) => {
    // Fetch detailed item information including category data
    try {
      const response = await fetch(`http://localhost:3000/api/ebay/item/${item.itemId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch item details')
      }

      const detailedItem = await response.json()
      onSelectItem({
        ...item,
        title: detailedItem.title,
        price: typeof detailedItem.price === 'number' ? detailedItem.price : parseFloat(detailedItem.price || '0'),
        condition: detailedItem.condition,
        categoryPath: detailedItem.categoryPath,
        categories: detailedItem.categories,
        primaryCategory: detailedItem.primaryCategory,
        categoryId: detailedItem.categoryId,
      })
      onClose()
    } catch (err) {
      // If detailed fetch fails, use the summary data with proper price conversion
      onSelectItem({
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
      })
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Auto-search when modal opens
  if (open && !hasSearched && !isLoading) {
    handleSearch()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">eBay Search Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Searching for: <span className="font-semibold">{searchQuery}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Searching eBay...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={handleSearch}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && results.length === 0 && hasSearched && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p className="mt-2 text-gray-600">Try searching with different keywords</p>
          </div>
        )}

        {!isLoading && !error && results.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Found {results.length} similar items. Click on an item to use its details.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item) => (
                <div
                  key={item.itemId}
                  onClick={() => handleSelectItem(item)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-blue-600">
                      ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || '0').toFixed(2)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {item.condition}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Seller: {item.seller}</p>
                  {item.categoryPath && (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 mt-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="truncate" title={item.categoryPath}>
                        {item.categoryPath.split('|').pop()?.trim()}
                      </span>
                    </div>
                  )}
                  <button
                    className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Use This Listing
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
