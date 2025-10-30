import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Table from '../components/Table'

interface Shipment {
  id: string
  orderId: string
  carrier: string
  trackingNumber: string
  status: string
  shippedDate: string
  estimatedDelivery: string
  recipient: {
    name: string
    address: string
    city: string
    state: string
    zip: string
  }
}

export default function Shipments() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => fetch('http://localhost:3000/api/shipments').then(res => res.json()),
  })

  const columns = [
    {
      header: 'Order ID',
      accessor: 'orderId' as const,
    },
    {
      header: 'Tracking Number',
      accessor: 'trackingNumber' as const,
    },
    {
      header: 'Carrier',
      accessor: 'carrier' as const,
    },
    {
      header: 'Recipient',
      accessor: (row: Shipment) => row.recipient.name,
      cell: (row: Shipment) => (
        <div>
          <div className="font-medium text-gray-900">{row.recipient.name}</div>
          <div className="text-sm text-gray-500">
            {row.recipient.city}, {row.recipient.state}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status' as const,
      cell: (row: Shipment) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          shipped: 'bg-blue-100 text-blue-800',
          'in-transit': 'bg-purple-100 text-purple-800',
          delivered: 'bg-green-100 text-green-800',
          exception: 'bg-red-100 text-red-800',
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
        )
      },
    },
    {
      header: 'Shipped Date',
      accessor: 'shippedDate' as const,
      cell: (row: Shipment) => new Date(row.shippedDate).toLocaleDateString(),
    },
    {
      header: 'Est. Delivery',
      accessor: 'estimatedDelivery' as const,
      cell: (row: Shipment) => new Date(row.estimatedDelivery).toLocaleDateString(),
    },
  ]

  const filteredShipments = shipments?.filter((shipment: Shipment) =>
    shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
        <p className="text-gray-600 mt-2">Track and manage all your shipments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shipments?.length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shipments?.filter((s: Shipment) => s.status === 'in-transit' || s.status === 'shipped').length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shipments?.filter((s: Shipment) => s.status === 'delivered').length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Exceptions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {shipments?.filter((s: Shipment) => s.status === 'exception').length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by tracking #, order ID, recipient, or carrier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            Create Shipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading shipments...</div>
        ) : !filteredShipments || filteredShipments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No shipments found matching your search.' : 'No shipments yet.'}
          </div>
        ) : (
          <Table
            data={filteredShipments}
            columns={columns}
          />
        )}
      </div>
    </div>
  )
}
