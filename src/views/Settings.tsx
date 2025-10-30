import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

interface EbayConnectionStatus {
  connected: boolean
  expiresAt?: string
  environment?: string
  error?: string
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)

  // Check for OAuth callback params
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const ebayConnected = searchParams.get('ebay_connected')
    const ebayError = searchParams.get('ebay_error')
    const errorReason = searchParams.get('reason')

    console.log('[eBay Frontend] OAuth callback params:', { code: !!code, state, ebayConnected, ebayError, errorReason })

    // If we received an authorization code, exchange it on the backend
    if (code) {
      console.log('[eBay Frontend] Authorization code received, exchanging on backend...')

      // Exchange code for tokens on backend
      fetch('http://localhost:3000/api/ebay/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      })
        .then(res => res.json())
        .then(data => {
          console.log('[eBay Frontend] Token exchange response:', data)
          if (data.success) {
            setShowSuccess(true)
            queryClient.invalidateQueries({ queryKey: ['ebay-status'] })
            // Clear URL params
            setSearchParams({})
            setTimeout(() => setShowSuccess(false), 5000)
          } else {
            setShowError(true)
            setSearchParams({})
            setTimeout(() => setShowError(false), 5000)
          }
        })
        .catch(error => {
          console.error('[eBay Frontend] Token exchange failed:', error)
          setShowError(true)
          setSearchParams({})
          setTimeout(() => setShowError(false), 5000)
        })

      return // Don't process other params
    }

    if (ebayConnected === 'true') {
      console.log('[eBay Frontend] eBay connected successfully, invalidating queries...')
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['ebay-status'] })
      // Remove query params
      setTimeout(() => {
        console.log('[eBay Frontend] Clearing success notification and params')
        setSearchParams({})
        setShowSuccess(false)
      }, 5000)
    }

    if (ebayError === 'true') {
      console.log('[eBay Frontend] eBay connection error:', errorReason)
      setShowError(true)
      setTimeout(() => {
        console.log('[eBay Frontend] Clearing error notification and params')
        setSearchParams({})
        setShowError(false)
      }, 5000)
    }
  }, [searchParams, queryClient, setSearchParams])

  const { data: ebayStatus, isLoading } = useQuery<EbayConnectionStatus>({
    queryKey: ['ebay-status'],
    queryFn: async () => {
      console.log('[eBay Frontend] Fetching eBay auth status...')
      const response = await fetch('http://localhost:3000/api/ebay/auth/status')
      const data = await response.json()
      console.log('[eBay Frontend] Auth status received:', data)
      return data
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('http://localhost:3000/api/ebay/auth/init')
      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || data.error)
      }

      // Redirect to eBay OAuth
      window.location.href = data.authUrl
    },
    onError: (error: Error) => {
      alert(`Failed to connect to eBay: ${error.message}`)
    },
  })

  const refreshMutation = useMutation({
    mutationFn: () =>
      fetch('http://localhost:3000/api/ebay/auth/refresh', {
        method: 'POST',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebay-status'] })
      alert('eBay token refreshed successfully!')
    },
    onError: () => {
      alert('Failed to refresh eBay token')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: () =>
      fetch('http://localhost:3000/api/ebay/auth/revoke', {
        method: 'POST',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebay-status'] })
    },
    onError: () => {
      alert('Failed to disconnect eBay')
    },
  })

  const handleConnect = () => {
    connectMutation.mutate()
  }

  const handleRefresh = () => {
    if (window.confirm('Refresh your eBay access token?')) {
      refreshMutation.mutate()
    }
  }

  const handleRevoke = () => {
    if (window.confirm('Are you sure you want to disconnect eBay? You will need to reconnect to create listings.')) {
      revokeMutation.mutate()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Success/Error notifications */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">Successfully connected to eBay!</span>
          </div>
        )}

        {showError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 font-medium">Failed to connect to eBay. Please try again.</span>
          </div>
        )}

        {/* eBay Integration Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.55 3.5c-1.9 0-2.75 1.5-2.75 3.25 0 1.75.85 3.25 2.75 3.25s2.75-1.5 2.75-3.25c0-1.75-.85-3.25-2.75-3.25zm9.45 0c-1.9 0-2.75 1.5-2.75 3.25 0 1.75.85 3.25 2.75 3.25s2.75-1.5 2.75-3.25c0-1.75-.85-3.25-2.75-3.25zM7.55 11c-2.75 0-5 2.25-5 5v2h10v-2c0-2.75-2.25-5-5-5zm9.45 0c-2.75 0-5 2.25-5 5v2h10v-2c0-2.75-2.25-5-5-5z"/>
              </svg>
              <h2 className="text-2xl font-bold text-white">eBay Integration</h2>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Checking eBay connection...</p>
              </div>
            ) : ebayStatus?.connected ? (
              <div>
                {/* Connected State */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Connected to eBay</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Your eBay account is connected and ready to create listings.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700">
                          Expires: <span className="font-medium">{ebayStatus.expiresAt ? formatDate(ebayStatus.expiresAt) : 'N/A'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        <span className="text-gray-700">
                          Environment: <span className="font-medium capitalize">{ebayStatus.environment || 'sandbox'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Token'}
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={revokeMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {revokeMutation.isPending ? 'Disconnecting...' : 'Disconnect eBay'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Disconnected State */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Connect to eBay</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your eBay account to start creating and managing listings directly from CrossPost.
                    </p>

                    {ebayStatus?.error && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> {ebayStatus.error}
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">What you'll get:</h4>
                      <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Create and publish listings to eBay directly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Sync listing status and sales data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Use AI to optimize listing titles and descriptions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Manage inventory and pricing from one place</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {connectMutation.isPending ? 'Connecting...' : 'Connect eBay Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Settings Sections (placeholder) */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">General Settings</h2>
          <p className="text-gray-600 text-sm">Additional settings coming soon...</p>
        </div>
      </div>
    </div>
  )
}
