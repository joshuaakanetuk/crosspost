import { useState, useEffect, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as Select from '@radix-ui/react-select'
import EbaySearchModal from './EbaySearchModal'

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

interface CreateListingModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (listing: ListingFormData) => void
}

export interface ListingFormData {
  inventoryId: string
  listingName: string
  listingDescription: string
  condition: string
  sku: string
  tags: string
  price: number
  compareAtPrice: number
  auctionStartPrice: number
  auctionReservePrice: number
  currency: string
  quantityAvailable: number
  category: string // JSON string: {"id": "123", "name": "Electronics"}
  itemSpecifics: Record<string, string>
  shippingWeight: number
  shippingLength: number
  shippingWidth: number
  shippingHeight: number
  shippingService: string
  shippingCost: number
  freeShipping: boolean
  localPickupOnly: boolean
  shippingProfileId: string
  marketplaces: string[]
  status: string
  publishDate: string
  endDate: string
}

const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'For Parts']
const STATUSES = ['draft', 'active', 'sold', 'ended', 'error']
const MARKETPLACES = ['ebay', 'facebook', 'depop', 'etsy', 'mercari', 'poshmark']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

// Helper function to parse category JSON and extract name
const getCategoryName = (categoryJson: string): string => {
  if (!categoryJson) return ''
  try {
    const parsed = JSON.parse(categoryJson)
    return parsed.name || ''
  } catch {
    return ''
  }
}

export default function CreateListingModal({
  open,
  onClose,
  onSubmit
}: CreateListingModalProps) {
  const [formData, setFormData] = useState<ListingFormData>({
    inventoryId: '',
    listingName: '',
    listingDescription: '',
    condition: 'Good',
    sku: '',
    tags: '',
    price: 0,
    compareAtPrice: 0,
    auctionStartPrice: 0,
    auctionReservePrice: 0,
    currency: 'USD',
    quantityAvailable: 1,
    category: '',
    itemSpecifics: {},
    shippingWeight: 0,
    shippingLength: 0,
    shippingWidth: 0,
    shippingHeight: 0,
    shippingService: '',
    shippingCost: 0,
    freeShipping: false,
    localPickupOnly: false,
    shippingProfileId: '',
    marketplaces: [],
    status: 'draft',
    publishDate: '',
    endDate: '',
  })
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null)
  const [showAISearch, setShowAISearch] = useState(false)
  const [showEbaySearch, setShowEbaySearch] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const [suggestedCategories, setSuggestedCategories] = useState<any[]>([])
  const [isSearchingCategories, setIsSearchingCategories] = useState(false)
  const [categoryAspects, setCategoryAspects] = useState<any>(null)
  const [isLoadingAspects, setIsLoadingAspects] = useState(false)
  const [aspectSearchQueries, setAspectSearchQueries] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    pricing: true,
    category: false,
    shipping: false,
    marketplaces: false,
  })

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetch('http://localhost:3000/api/inventory').then(res => res.json()),
    enabled: open,
  })

  // Fetch category aspects when category changes
  useEffect(() => {
    const fetchCategoryAspects = async () => {
      if (!formData.category) {
        setCategoryAspects(null)
        return
      }

      try {
        const categoryData = JSON.parse(formData.category)
        const categoryId = categoryData.id

        if (!categoryId) {
          setCategoryAspects(null)
          return
        }

        setIsLoadingAspects(true)
        const response = await fetch(`http://localhost:3000/api/ebay/categories/${categoryId}/aspects`)

        if (!response.ok) {
          throw new Error('Failed to fetch category aspects')
        }

        const data = await response.json()
        setCategoryAspects(data)
      } catch (error) {
        console.error('Failed to fetch category aspects:', error)
        setCategoryAspects(null)
      } finally {
        setIsLoadingAspects(false)
      }
    }

    fetchCategoryAspects()
  }, [formData.category])

  const { data: rootCategories } = useQuery({
    queryKey: ['ebay-categories'],
    queryFn: () => fetch('http://localhost:3000/api/ebay/categories').then(res => res.json()),
    enabled: open,
  })

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        inventoryId: '',
        listingName: '',
        listingDescription: '',
        condition: 'Good',
        sku: '',
        tags: '',
        price: 0,
        compareAtPrice: 0,
        auctionStartPrice: 0,
        auctionReservePrice: 0,
        currency: 'USD',
        quantityAvailable: 1,
        category: '',
        itemSpecifics: {},
        shippingWeight: 0,
        shippingLength: 0,
        shippingWidth: 0,
        shippingHeight: 0,
        shippingService: '',
        shippingCost: 0,
        freeShipping: false,
        localPickupOnly: false,
        shippingProfileId: '',
        marketplaces: [],
        status: 'draft',
        publishDate: '',
        endDate: '',
      })
      setSelectedInventory(null)
      setCategorySearchQuery('')
      setSuggestedCategories([])
    }
  }, [open])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!formData.inventoryId) {
      alert('Please select an inventory item')
      return
    }
    onSubmit(formData)
    onClose()
  }

  const handleInventorySelect = (inventoryId: string) => {
    const item = inventoryItems?.find((inv: InventoryItem) => inv.id === inventoryId)
    setSelectedInventory(item || null)

    // Auto-populate listing data from inventory if empty
    if (item) {
      setFormData(prev => ({
        ...prev,
        inventoryId,
        listingName: prev.listingName || item.name,
        listingDescription: prev.listingDescription || item.description || '',
        price: prev.price || item.price,
        quantityAvailable: item.quantity
      }))
    } else {
      setFormData(prev => ({ ...prev, inventoryId }))
    }
  }

  const handleAISearch = () => {
    // TODO: Implement AI search integration
    alert('AI search functionality coming soon! This will:\n\n1. Use AI to analyze the item\n2. Generate optimized title and description\n3. Suggest pricing based on market data')
    setShowAISearch(true)
  }

  const handleEbaySearch = () => {
    if (!selectedInventory) {
      alert('Please select an inventory item first')
      return
    }
    setShowEbaySearch(true)
  }

  const handleEbayItemSelect = async (item: any) => {
    // Autofill form with eBay data
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')

    // Check if we have primaryCategory from the eBay item (best option)
    if (item.primaryCategory && item.primaryCategory.id) {
      const categoryData = JSON.stringify({
        id: item.primaryCategory.id,
        name: item.primaryCategory.name,
        path: item.primaryCategory.path
      })

      setFormData(prev => ({
        ...prev,
        listingName: item.title,
        price: price,
        condition: item.condition || prev.condition,
        category: categoryData,
      }))
      setCategorySearchQuery(item.primaryCategory.name)
      setExpandedSections(prev => ({ ...prev, category: true }))
      setShowEbaySearch(false)
      return
    }

    // Fallback: Extract category from categoryPath
    let suggestedCategoryName = ''
    if (item.categoryPath) {
      // Use the most specific category (last one in the path)
      const categories = item.categoryPath.split('|').map((c: string) => c.trim())
      suggestedCategoryName = categories[categories.length - 1] || ''
    }

    // If we have a category name, try to find its ID using getCategorySuggestions
    if (suggestedCategoryName) {
      try {
        const response = await fetch(`http://localhost:3000/api/ebay/categories?q=${encodeURIComponent(suggestedCategoryName)}`)
        const data = await response.json()

        if (data.categories && data.categories.length > 0) {
          // Use the first matching category from getCategorySuggestions
          const matchedCategory = data.categories[0]
          const categoryData = JSON.stringify({
            id: matchedCategory.categoryId || '',
            name: matchedCategory.categoryName || suggestedCategoryName
          })

          setFormData(prev => ({
            ...prev,
            listingName: item.title,
            price: price,
            condition: item.condition || prev.condition,
            category: categoryData,
          }))
          setCategorySearchQuery(matchedCategory.categoryName || suggestedCategoryName)
          setExpandedSections(prev => ({ ...prev, category: true }))
        } else {
          // If no match, just use the extracted category name without ID
          const categoryData = JSON.stringify({
            id: '',
            name: suggestedCategoryName
          })
          setFormData(prev => ({
            ...prev,
            listingName: item.title,
            price: price,
            condition: item.condition || prev.condition,
            category: categoryData,
          }))
          setCategorySearchQuery(suggestedCategoryName)
          setExpandedSections(prev => ({ ...prev, category: true }))
        }
      } catch (error) {
        console.error('Failed to fetch category:', error)
        // Fall back to just setting the basic fields
        setFormData(prev => ({
          ...prev,
          listingName: item.title,
          price: price,
          condition: item.condition || prev.condition,
        }))
      }
    } else {
      // No category info, just set basic fields
      setFormData(prev => ({
        ...prev,
        listingName: item.title,
        price: price,
        condition: item.condition || prev.condition,
      }))
    }

    setShowEbaySearch(false)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleMarketplaceToggle = (marketplace: string) => {
    setFormData(prev => ({
      ...prev,
      marketplaces: prev.marketplaces.includes(marketplace)
        ? prev.marketplaces.filter(m => m !== marketplace)
        : [...prev.marketplaces, marketplace]
    }))
  }

  const handleCategorySearch = async (query: string) => {
    if (!query.trim()) {
      setSuggestedCategories([])
      return
    }

    setIsSearchingCategories(true)
    try {
      const response = await fetch(`http://localhost:3000/api/ebay/categories?keywords=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSuggestedCategories(data.categories || [])
    } catch (error) {
      console.error('Category search error:', error)
      setSuggestedCategories([])
    } finally {
      setIsSearchingCategories(false)
    }
  }

  const handleCategorySelect = (category: any) => {
    const categoryId = category.categoryId || category.id || ''
    const categoryName = category.categoryName || category.name || ''

    // Store category as JSON string with id and name
    const categoryData = JSON.stringify({
      id: categoryId,
      name: categoryName
    })

    setFormData(prev => ({
      ...prev,
      category: categoryData,
    }))
    setCategorySearchQuery(categoryName)
    setSuggestedCategories([])
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Listing</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Inventory Item Selection */}
          <div>
            <label htmlFor="inventoryId" className="block text-sm font-medium text-gray-700 mb-1">
              Select Inventory Item *
            </label>
            <Select.Root value={formData.inventoryId} onValueChange={handleInventorySelect}>
              <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between">
                <Select.Value placeholder="-- Select an inventory item --" />
                <Select.Icon>
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[100]">
                  <Select.Viewport className="p-1">
                    {inventoryItems?.map((item: InventoryItem) => (
                      <Select.Item
                        key={item.id}
                        value={item.id}
                        className="px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer hover:bg-blue-50 rounded data-[highlighted]:bg-blue-50"
                      >
                        <Select.ItemText>{item.name} (Qty: {item.quantity})</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Selected Inventory Preview */}
          {selectedInventory && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-4">
                {selectedInventory.media && selectedInventory.media.length > 0 && (
                  <img
                    src={selectedInventory.media[0].url}
                    alt={selectedInventory.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedInventory.name}</h3>
                  <p className="text-sm text-gray-600">{selectedInventory.description || 'No description'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Price: ${selectedInventory.price.toFixed(2)} | Quantity: {selectedInventory.quantity}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI and eBay Search Buttons */}
          {selectedInventory && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleAISearch}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Use AI Search
              </button>
              <button
                type="button"
                onClick={handleEbaySearch}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search eBay
              </button>
            </div>
          )}

          {/* BASIC INFO SECTION */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>Basic Information</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.basic ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.basic && (
              <div className="p-4 space-y-4">
                <div>
                  <label htmlFor="listingName" className="block text-sm font-medium text-gray-700 mb-1">
                    Listing Name *
                  </label>
                  <input
                    type="text"
                    id="listingName"
                    required
                    value={formData.listingName}
                    onChange={(e) => setFormData({ ...formData, listingName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter listing title"
                  />
                </div>

                <div>
                  <label htmlFor="listingDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Listing Description
                  </label>
                  <textarea
                    id="listingDescription"
                    rows={4}
                    value={formData.listingDescription}
                    onChange={(e) => setFormData({ ...formData, listingDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter detailed listing description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
                      Condition {categoryAspects?.conditions && <span className="text-green-600 text-xs">(eBay Verified)</span>}
                    </label>
                    <Select.Root value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                      <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between">
                        <Select.Value />
                        <Select.Icon>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[100]">
                          <Select.Viewport className="p-1">
                            {(categoryAspects?.conditions || CONDITIONS).map((condition: any) => {
                              const conditionValue = typeof condition === 'string' ? condition : condition.value
                              return (
                                <Select.Item
                                  key={conditionValue}
                                  value={conditionValue}
                                  className="px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer hover:bg-blue-50 rounded data-[highlighted]:bg-blue-50"
                                >
                                  <Select.ItemText>{conditionValue}</Select.ItemText>
                                </Select.Item>
                              )
                            })}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    {isLoadingAspects && (
                      <p className="text-xs text-gray-500 mt-1">Loading valid conditions...</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select.Root value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between">
                        <Select.Value />
                        <Select.Icon>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[100]">
                          <Select.Viewport className="p-1">
                            {STATUSES.map(status => (
                              <Select.Item
                                key={status}
                                value={status}
                                className="px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer hover:bg-blue-50 rounded data-[highlighted]:bg-blue-50"
                              >
                                <Select.ItemText>{status.charAt(0).toUpperCase() + status.slice(1)}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Optional SKU"
                    />
                  </div>
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Comma-separated tags"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRICING SECTION */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('pricing')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>Pricing & Quantity</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.pricing ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.pricing && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="price"
                        min="0"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="compareAtPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Compare At Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="compareAtPrice"
                        min="0"
                        step="0.01"
                        value={formData.compareAtPrice}
                        onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <Select.Root value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between">
                        <Select.Value />
                        <Select.Icon>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[100]">
                          <Select.Viewport className="p-1">
                            {CURRENCIES.map(curr => (
                              <Select.Item
                                key={curr}
                                value={curr}
                                className="px-3 py-2 text-sm text-gray-900 outline-none cursor-pointer hover:bg-blue-50 rounded data-[highlighted]:bg-blue-50"
                              >
                                <Select.ItemText>{curr}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="auctionStartPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Auction Start Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="auctionStartPrice"
                        min="0"
                        step="0.01"
                        value={formData.auctionStartPrice}
                        onChange={(e) => setFormData({ ...formData, auctionStartPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="auctionReservePrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Auction Reserve Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="auctionReservePrice"
                        min="0"
                        step="0.01"
                        value={formData.auctionReservePrice}
                        onChange={(e) => setFormData({ ...formData, auctionReservePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="quantityAvailable" className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Available *
                    </label>
                    <input
                      type="number"
                      id="quantityAvailable"
                      min="1"
                      required
                      value={formData.quantityAvailable}
                      onChange={(e) => setFormData({ ...formData, quantityAvailable: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY SECTION */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('category')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>Category & Item Specifics</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.category ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.category && (
              <div className="p-4 space-y-4">
                {/* Category Search */}
                <div>
                  <label htmlFor="categorySearch" className="block text-sm font-medium text-gray-700 mb-1">
                    eBay Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="categorySearch"
                      value={categorySearchQuery || getCategoryName(formData.category)}
                      onChange={(e) => {
                        setCategorySearchQuery(e.target.value)
                        handleCategorySearch(e.target.value)
                      }}
                      placeholder="Search for a category (e.g., 'electronics', 'clothing')..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    {isSearchingCategories && (
                      <div className="absolute right-3 top-2.5">
                        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Category Suggestions */}
                  {suggestedCategories.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                      {suggestedCategories.map((cat, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleCategorySelect(cat)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between group transition-colors"
                        >
                          <span className="text-sm text-gray-900">{cat.categoryName || cat.name}</span>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Category Display */}
                  {getCategoryName(formData.category) && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-900 font-medium">{getCategoryName(formData.category)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category: '' }))
                          setCategorySearchQuery('')
                        }}
                        className="ml-auto text-green-700 hover:text-green-900"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Root Categories */}
                  {!categorySearchQuery && !getCategoryName(formData.category) && rootCategories?.categories && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Popular categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {rootCategories.categories.map((cat: any) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 italic">
                  Tip: Search for keywords related to your item to find the most accurate category
                </p>

                {/* Required Fields for eBay */}
                {isLoadingAspects && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-sm text-blue-900 font-medium">Loading category requirements...</p>
                    </div>
                  </div>
                )}

                {categoryAspects && !isLoadingAspects && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="text-sm font-semibold text-indigo-900">eBay Category Requirements</h4>
                    </div>

                    {/* Valid Conditions Info */}
                    {categoryAspects.conditions && categoryAspects.conditions.length > 0 && (
                      <div className="mb-3 p-3 bg-white/70 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-1">Valid Conditions for this category:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {categoryAspects.conditions.map((cond: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                              {typeof cond === 'string' ? cond : cond.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Required Fields */}
                    {categoryAspects.requiredAspects && categoryAspects.requiredAspects.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-indigo-900">
                          Required Fields ({categoryAspects.requiredAspects.length})
                        </p>
                        {categoryAspects.requiredAspects.map((aspect: any) => (
                          <div key={aspect.name}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {aspect.name} <span className="text-red-500">*</span>
                            </label>
                            {aspect.values && aspect.values.length > 0 ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={aspectSearchQueries[aspect.name] || formData.itemSpecifics[aspect.name] || ''}
                                  onChange={(e) => {
                                    setAspectSearchQueries(prev => ({
                                      ...prev,
                                      [aspect.name]: e.target.value
                                    }))
                                  }}
                                  onFocus={() => {
                                    // Clear search query on focus to show all options
                                    if (!aspectSearchQueries[aspect.name]) {
                                      setAspectSearchQueries(prev => ({
                                        ...prev,
                                        [aspect.name]: ''
                                      }))
                                    }
                                  }}
                                  placeholder={`Type to search ${aspect.name}...`}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                                {aspectSearchQueries[aspect.name] !== undefined && (
                                  <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                                    {aspect.values
                                      .filter((value: string) =>
                                        value.toLowerCase().includes((aspectSearchQueries[aspect.name] || '').toLowerCase())
                                      )
                                      .map((value: string) => (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() => {
                                            setFormData(prev => ({
                                              ...prev,
                                              itemSpecifics: {
                                                ...prev.itemSpecifics,
                                                [aspect.name]: value
                                              }
                                            }))
                                            setAspectSearchQueries(prev => {
                                              const updated = { ...prev }
                                              delete updated[aspect.name]
                                              return updated
                                            })
                                          }}
                                          className="w-full px-3 py-2 text-sm text-left text-gray-900 hover:bg-indigo-50 transition-colors"
                                        >
                                          {value}
                                        </button>
                                      ))}
                                    {aspect.values.filter((value: string) =>
                                      value.toLowerCase().includes((aspectSearchQueries[aspect.name] || '').toLowerCase())
                                    ).length === 0 && (
                                      <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                                    )}
                                  </div>
                                )}
                                {formData.itemSpecifics[aspect.name] && !aspectSearchQueries[aspect.name] && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        itemSpecifics: {
                                          ...prev.itemSpecifics,
                                          [aspect.name]: ''
                                        }
                                      }))
                                    }}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={formData.itemSpecifics[aspect.name] || ''}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    itemSpecifics: {
                                      ...prev.itemSpecifics,
                                      [aspect.name]: e.target.value
                                    }
                                  }))
                                }}
                                placeholder={`Enter ${aspect.name}`}
                                maxLength={aspect.maxLength}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              />
                            )}
                            {aspect.maxLength && (
                              <p className="text-xs text-gray-500 mt-1">Max {aspect.maxLength} characters</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="mt-3 pt-3 border-t border-indigo-200 flex items-center justify-between text-xs text-indigo-700">
                      <span>{categoryAspects.requiredAspects?.length || 0} required fields</span>
                      <span>{categoryAspects.recommendedAspects?.length || 0} recommended fields</span>
                      <span>{categoryAspects.totalAspects || 0} total aspects</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SHIPPING SECTION */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('shipping')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>Shipping</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.shipping ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.shipping && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="shippingWeight" className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (oz)
                    </label>
                    <input
                      type="number"
                      id="shippingWeight"
                      min="0"
                      step="0.1"
                      value={formData.shippingWeight}
                      onChange={(e) => setFormData({ ...formData, shippingWeight: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="shippingLength" className="block text-sm font-medium text-gray-700 mb-1">
                      Length (in)
                    </label>
                    <input
                      type="number"
                      id="shippingLength"
                      min="0"
                      step="0.1"
                      value={formData.shippingLength}
                      onChange={(e) => setFormData({ ...formData, shippingLength: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="shippingWidth" className="block text-sm font-medium text-gray-700 mb-1">
                      Width (in)
                    </label>
                    <input
                      type="number"
                      id="shippingWidth"
                      min="0"
                      step="0.1"
                      value={formData.shippingWidth}
                      onChange={(e) => setFormData({ ...formData, shippingWidth: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label htmlFor="shippingHeight" className="block text-sm font-medium text-gray-700 mb-1">
                      Height (in)
                    </label>
                    <input
                      type="number"
                      id="shippingHeight"
                      min="0"
                      step="0.1"
                      value={formData.shippingHeight}
                      onChange={(e) => setFormData({ ...formData, shippingHeight: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shippingService" className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Service
                    </label>
                    <input
                      type="text"
                      id="shippingService"
                      value={formData.shippingService}
                      onChange={(e) => setFormData({ ...formData, shippingService: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., USPS Priority, FedEx Ground"
                    />
                  </div>
                  <div>
                    <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="shippingCost"
                        min="0"
                        step="0.01"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shippingProfileId" className="block text-sm font-medium text-gray-700 mb-1">
                      Shippo Profile ID
                    </label>
                    <input
                      type="text"
                      id="shippingProfileId"
                      value={formData.shippingProfileId}
                      onChange={(e) => setFormData({ ...formData, shippingProfileId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Optional Shippo profile ID"
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.freeShipping}
                        onChange={(e) => setFormData({ ...formData, freeShipping: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Free Shipping</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.localPickupOnly}
                        onChange={(e) => setFormData({ ...formData, localPickupOnly: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Local Pickup Only</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MARKETPLACES SECTION */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('marketplaces')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
            >
              <span>Marketplaces</span>
              <svg className={`w-5 h-5 transition-transform ${expandedSections.marketplaces ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.marketplaces && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600 mb-3">Select which marketplaces to list this item on:</p>
                <div className="grid grid-cols-2 gap-3">
                  {MARKETPLACES.map(marketplace => (
                    <label key={marketplace} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.marketplaces.includes(marketplace)}
                        onChange={() => handleMarketplaceToggle(marketplace)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 capitalize">{marketplace}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Publish Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="publishDate"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Schedule automatic publishing at a future date/time</p>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Automatically end listing at this date/time</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-blue-900">
                    <p className="font-medium mb-1">Scheduled Publishing</p>
                    <p>Set a publish date to automatically post this listing to selected marketplaces at the specified time. The scheduler runs every minute to check for listings ready to publish.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Create Listing
            </button>
          </div>
        </form>
      </div>

      {/* eBay Search Modal */}
      <EbaySearchModal
        open={showEbaySearch}
        onClose={() => setShowEbaySearch(false)}
        searchQuery={selectedInventory?.name || ''}
        onSelectItem={handleEbayItemSelect}
      />
    </div>
  )
}
