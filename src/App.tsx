import { Routes, Route } from 'react-router-dom'
import Home from './views/Home'
import Camera from './views/Camera'
import Inventory from './views/Inventory'
  
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/camera" element={<Camera />} />
      {/* Inventory Route */}
      <Route path="/inventory" element={<Inventory />} />
    </Routes>
  )
}

export default App
