import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LiveMode from './components/LiveMode';
import PotholeMap from './components/PotholeMap';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2]">
              <div className="flex min-h-[90vh] p-8 flex-col lg:flex-row">
                <div className="flex-1 flex flex-col justify-center p-8">
                  <h1 className="text-5xl lg:text-6xl mb-4 bg-gradient-to-r from-[#3498db] to-[#2c3e50] bg-clip-text text-transparent font-extrabold">Hazard Eye</h1>
                  <p className="text-2xl lg:text-3xl text-gray-600 mb-10">Enhancing road safety with AI-powered detection</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-lg shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-xl mb-2 text-[#2c3e50]">Real-time Detection</h3>
                      <p className="text-gray-600 text-sm">Identify road hazards instantly using advanced YOLO technology</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="text-4xl mb-4">🗺️</div>
                      <h3 className="text-xl mb-2 text-[#2c3e50]">Interactive Mapping</h3>
                      <p className="text-gray-600 text-sm">View and track hazards on an interactive map interface</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="text-4xl mb-4">⚠️</div>
                      <h3 className="text-xl mb-2 text-[#2c3e50]">Alert System</h3>
                      <p className="text-gray-600 text-sm">Receive notifications when approaching known hazards</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6 mt-4">
                    <Link to="/live">
                      <button className="px-8 py-4 text-lg border-none rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 font-semibold shadow-md bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white hover:-translate-y-1 hover:shadow-lg">
                        <span className="text-xl">▶️</span>
                        <span>Live Detection</span>
                      </button>
                    </Link>
                    <Link to="/pothole-map">
                      <button className="px-8 py-4 text-lg border-none rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 font-semibold shadow-md bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white hover:-translate-y-1 hover:shadow-lg">
                        <span className="text-xl">🗺️</span>
                        <span>View Hazard Map</span>
                      </button>
                    </Link>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full h-[500px] bg-cover bg-center rounded-xl shadow-lg relative overflow-hidden" style={{backgroundImage: 'url(/road-detection.jpg)'}}>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-2xl font-bold text-center">AI-Powered Road Safety</div>
                  </div>
                </div>
              </div>
              
              <footer className="text-center py-6 mt-auto text-gray-600 text-sm">
                <p>© 2025 Road Hazard Detection System | Powered by YOLO Object Detection</p>
              </footer>
            </div>
          }
        />
        <Route path="/live" element={<LiveMode />} />
        <Route path="/pothole-map" element={<PotholeMap />} />
      </Routes>
    </Router>
  );
}
