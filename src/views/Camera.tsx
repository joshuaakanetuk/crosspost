import { Link } from 'react-router-dom'
import CameraModal from '../components/CameraModal'
import { useState } from 'react'

export default function Camera() {
  const [open, setOpen] = useState(false);
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
      <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded" onClick={() => {setOpen(true)  }}>
        Open Camera
      </button>

      {/* Camera interface */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
        <CameraModal open={open} onClose={() => setOpen(false)} />  
      </div>
    </div>
  )
}
