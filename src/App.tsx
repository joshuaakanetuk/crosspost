import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './views/Home';
import Camera from './views/Camera';
import Inventory from './views/Inventory';
import Listings from './views/Listings';
import Shipments from './views/Shipments';
import Settings from './views/Settings';
import Sidebar from './components/Sidebar';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto pl-64">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
