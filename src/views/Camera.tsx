import { Link } from 'react-router-dom'
import CameraModal from '../components/CameraModal'

export default function Camera() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with navigation */}
      <div className="p-4">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Camera interface */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
        <CameraModal open={true} />
      </div>
    </div>
  )
}
