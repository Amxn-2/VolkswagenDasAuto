import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, RotateCw, AlertTriangle, Navigation, X, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function PotholeMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routingControlRef = useRef(null);
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);
  const [showRoutePanel, setShowRoutePanel] = useState(true);
  const routeMarkersRef = useRef([]);
  
  useEffect(() => {
    // Fetch pothole data from our API
    const fetchPotholes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/hazard-reports');
        setPotholes(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pothole data:', err);
        setError('Failed to load pothole data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchPotholes();
  }, []);
  
  useEffect(() => {
    // Initialize Leaflet map
    const initMap = async () => {
      if (!mapRef.current) return;
      
      // Clean up existing map if it exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
      
      // Load leaflet.heat plugin for heatmap if needed
      if (potholes.length > 10 && typeof L.heatLayer === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        script.async = true;
        script.onload = createMap;
        document.body.appendChild(script);
      } else {
        createMap();
      }
    };
    
    const createMap = () => {
      if (!mapRef.current) return;
      
      // Calculate center point from all potholes
      let centerLat = 0;
      let centerLng = 0;
      
      if (potholes.length > 0) {
        potholes.forEach(pothole => {
          if (pothole.location && pothole.location.lat && pothole.location.lng) {
            centerLat += pothole.location.lat;
            centerLng += pothole.location.lng;
          }
        });
        
        centerLat /= potholes.length;
        centerLng /= potholes.length;
      } else {
        // Default center (can be adjusted)
        centerLat = 0;
        centerLng = 0;
      }
      
      // Create Leaflet map instance
      const map = L.map(mapRef.current).setView([centerLat, centerLng], potholes.length > 0 ? 13 : 2);
      
      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
      
      mapInstanceRef.current = map;
      
      // Add markers for each pothole
      potholes.forEach(pothole => {
        if (!pothole.location || !pothole.location.lat || !pothole.location.lng) {
          return;
        }
        
        // Create custom icon for hazard markers
        const hazardIcon = L.divIcon({
          className: 'hazard-marker',
          html: '<div style="background-color: #e74c3c; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #c0392b; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        const marker = L.marker([pothole.location.lat, pothole.location.lng], {
          icon: hazardIcon
        }).addTo(map);
        
        // Create popup with pothole info
        const popupContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.9rem;">
            <h3 style="margin-top: 0; margin-bottom: 5px; font-size: 1rem; color: #2c3e50;">Road Hazard</h3>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${pothole.type || 'Unknown'}</p>
            <p style="margin: 4px 0;"><strong>Severity:</strong> ${pothole.severity || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Reported:</strong> ${new Date(pothole.timestamp).toLocaleString()}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${pothole.status || 'reported'}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      });
      
      // Add heat map layer if there are many potholes and plugin is loaded
      if (potholes.length > 10 && typeof L.heatLayer !== 'undefined') {
        const heatPoints = potholes
          .filter(p => p.location && p.location.lat && p.location.lng)
          .map(pothole => [pothole.location.lat, pothole.location.lng, 1]);
        
        if (heatPoints.length > 0) {
          const heatmapLayer = L.heatLayer(heatPoints, {
            radius: 40,
            blur: 15,
            maxZoom: 17,
            gradient: {
              0.0: 'blue',
              0.5: 'cyan',
              0.7: 'lime',
              0.9: 'yellow',
              1.0: 'red'
            }
          }).addTo(map);
        }
      }
      
      // Fit map bounds to show all markers if we have potholes
      if (potholes.length > 0 && markersRef.current.length > 0) {
        const group = new L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    };
    
    initMap();
    
    // Cleanup function
    return () => {
      if (routingControlRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      if (mapInstanceRef.current) {
        routeMarkersRef.current.forEach(marker => {
          mapInstanceRef.current.removeLayer(marker);
        });
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      routeMarkersRef.current = [];
    };
  }, [potholes]);
  
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/hazard-reports');
      setPotholes(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pothole data:', err);
      setError('Failed to load pothole data. Please try again later.');
      setLoading(false);
    }
  };

  // Geocode address using Nominatim (OpenStreetMap geocoding service)
  const geocodeAddress = async (address) => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'HazardEye/1.0' // Required by Nominatim
        }
      });
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Handle start location search
  const handleStartSearch = async () => {
    if (!startLocation.trim()) return;
    
    setSearchingStart(true);
    const result = await geocodeAddress(startLocation);
    setSearchingStart(false);
    
      if (result) {
        setStartCoords(result);
        setStartLocation(result.displayName);
        if (mapInstanceRef.current) {
          // Remove existing start marker
          const startMarkerIndex = routeMarkersRef.current.findIndex(m => m._routeType === 'start');
          if (startMarkerIndex !== -1) {
            mapInstanceRef.current.removeLayer(routeMarkersRef.current[startMarkerIndex]);
            routeMarkersRef.current.splice(startMarkerIndex, 1);
          }
          
          // Add marker for start location
          const startMarker = L.marker([result.lat, result.lng], {
            icon: L.divIcon({
              className: 'route-marker-start',
              html: '<div style="background-color: #2ecc71; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(mapInstanceRef.current);
          startMarker._routeType = 'start'; // Mark as start marker
          startMarker.bindPopup('Start: ' + result.displayName).openPopup();
          routeMarkersRef.current.push(startMarker);
        }
        if (endCoords) {
          calculateRoute();
        }
      } else {
        alert('Could not find location. Please try a more specific address.');
      }
  };

  // Handle end location search
  const handleEndSearch = async () => {
    if (!endLocation.trim()) return;
    
    setSearchingEnd(true);
    const result = await geocodeAddress(endLocation);
    setSearchingEnd(false);
    
      if (result) {
        setEndCoords(result);
        setEndLocation(result.displayName);
        if (mapInstanceRef.current) {
          // Remove existing end marker
          const endMarkerIndex = routeMarkersRef.current.findIndex(m => m._routeType === 'end');
          if (endMarkerIndex !== -1) {
            mapInstanceRef.current.removeLayer(routeMarkersRef.current[endMarkerIndex]);
            routeMarkersRef.current.splice(endMarkerIndex, 1);
          }
          
          // Add marker for end location
          const endMarker = L.marker([result.lat, result.lng], {
            icon: L.divIcon({
              className: 'route-marker-end',
              html: '<div style="background-color: #e74c3c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(mapInstanceRef.current);
          endMarker._routeType = 'end'; // Mark as end marker
          endMarker.bindPopup('End: ' + result.displayName).openPopup();
          routeMarkersRef.current.push(endMarker);
        }
        if (startCoords) {
          calculateRoute();
        }
      } else {
        alert('Could not find location. Please try a more specific address.');
      }
  };

  // Use current location for start
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            displayName: 'Current Location'
          };
          setStartCoords(coords);
          setStartLocation('Current Location');
          if (mapInstanceRef.current) {
            // Remove existing start marker
            const startMarkerIndex = routeMarkersRef.current.findIndex(m => m._routeType === 'start');
            if (startMarkerIndex !== -1) {
              mapInstanceRef.current.removeLayer(routeMarkersRef.current[startMarkerIndex]);
              routeMarkersRef.current.splice(startMarkerIndex, 1);
            }
            
            const startMarker = L.marker([coords.lat, coords.lng], {
              icon: L.divIcon({
                className: 'route-marker-start',
                html: '<div style="background-color: #2ecc71; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })
            }).addTo(mapInstanceRef.current);
            startMarker._routeType = 'start'; // Mark as start marker
            startMarker.bindPopup('Start: Current Location').openPopup();
            routeMarkersRef.current.push(startMarker);
          }
          if (endCoords) {
            calculateRoute();
          }
        },
        (error) => {
          alert('Could not get your current location. Please enable location permissions.');
        }
      );
    }
  };

  // Calculate and display route
  const calculateRoute = async () => {
    if (!startCoords || !endCoords || !mapInstanceRef.current) return;

    // Remove existing route if any
    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Load Leaflet Routing Machine if not already loaded
    if (typeof window.L === 'undefined' || !window.L.Routing) {
      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js';
      script.onload = () => {
        createRoute();
      };
      document.body.appendChild(script);
    } else {
      createRoute();
    }
  };

  const createRoute = () => {
    if (!startCoords || !endCoords || !mapInstanceRef.current) return;

    try {
      // Use OSRM routing service (free and open-source)
      routingControlRef.current = window.L.Routing.control({
        waypoints: [
          window.L.latLng(startCoords.lat, startCoords.lng),
          window.L.latLng(endCoords.lat, endCoords.lng)
        ],
        router: window.L.Routing.osrmv1({
          serviceUrl: 'https://router.projectosrm.org/route/v1',
          profile: 'driving'
        }),
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
          styles: [
            { color: '#3498db', opacity: 0.8, weight: 6 }
          ]
        },
        createMarker: function(i, waypoint) {
          return null; // Don't create default markers, we use custom ones
        }
      }).addTo(mapInstanceRef.current);

      // Listen for route calculation
      routingControlRef.current.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
          const route = routes[0];
          const distance = (route.summary.totalDistance / 1000).toFixed(2); // Convert to km
          const time = Math.round(route.summary.totalTime / 60); // Convert to minutes
          setRouteInfo({
            distance: distance,
            time: time
          });
        }
      });

      // Fit map to show route
      const bounds = window.L.latLngBounds([
        [startCoords.lat, startCoords.lng],
        [endCoords.lat, endCoords.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } catch (err) {
      console.error('Routing error:', err);
      alert('Could not calculate route. Please try again.');
    }
  };

  // Clear route
  const clearRoute = () => {
    if (routingControlRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    // Remove route markers
    if (mapInstanceRef.current) {
      routeMarkersRef.current.forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      routeMarkersRef.current = [];
    }
    
    setStartLocation('');
    setEndLocation('');
    setStartCoords(null);
    setEndCoords(null);
    setRouteInfo(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-white hover:text-[#3498db] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Home</span>
            </motion.button>
          </Link>
          
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <MapPin className="text-[#e74c3c] w-7 h-7" />
            Hazard Map
          </h1>
          
          <Link to="/live">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-full font-semibold shadow-lg"
            >
              <span className="hidden sm:inline">Live Detection</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
        >
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-10 h-10 text-[#e74c3c]" />
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRefresh}
                disabled={loading}
                className="text-white hover:text-[#3498db] transition-colors"
              >
                <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
            <div className="text-gray-300 text-sm mb-1">Total Hazard Locations</div>
            <div className="text-4xl font-bold text-white">{potholes.length}</div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="mb-2">
              <MapPin className="w-10 h-10 text-[#3498db]" />
            </div>
            <div className="text-gray-300 text-sm mb-1">Recent Reports (7 Days)</div>
            <div className="text-4xl font-bold text-white">
              {potholes.filter(p => new Date(p.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <div className="mb-2">
              <AlertTriangle className="w-10 h-10 text-[#f39c12]" />
            </div>
            <div className="text-gray-300 text-sm mb-1">Active Hazards</div>
            <div className="text-4xl font-bold text-white">
              {potholes.filter(p => p.status === 'reported').length}
            </div>
          </motion.div>
        </motion.div>

        {/* Loading and Error States */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6 text-center"
          >
            <div className="w-16 h-16 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading hazard data...</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#e74c3c]/20 backdrop-blur-lg rounded-2xl p-6 border border-[#e74c3c] mb-6 text-center"
          >
            <AlertTriangle className="w-16 h-16 text-[#e74c3c] mx-auto mb-3" />
            <p className="text-white text-lg">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="mt-4 px-6 py-2 bg-[#e74c3c] text-white rounded-full font-semibold"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

        {/* Routing Panel */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 mb-6"
        >
          <div className="bg-white/5 px-6 py-4 border-b border-white/20 flex items-center justify-between">
            <h2 className="text-white text-xl font-semibold flex items-center gap-2">
              <Navigation className="text-[#3498db] w-6 h-6" />
              Route Planner
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRoutePanel(!showRoutePanel)}
              className="text-white hover:text-[#3498db] transition-colors"
            >
              {showRoutePanel ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </motion.button>
          </div>
          
          {showRoutePanel && (
            <div className="p-6 space-y-4">
              {/* Start Location */}
              <div>
                <label className="block text-white text-sm font-semibold mb-2">Start Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStartSearch()}
                    placeholder="Enter start address or click 'Use Current'"
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3498db]"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUseCurrentLocation}
                    className="px-4 py-2 bg-[#2ecc71] text-white rounded-lg font-semibold hover:bg-[#27ae60] transition-colors whitespace-nowrap"
                  >
                    Use Current
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartSearch}
                    disabled={searchingStart || !startLocation.trim()}
                    className="px-4 py-2 bg-[#3498db] text-white rounded-lg font-semibold hover:bg-[#2980b9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {searchingStart ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </motion.button>
                </div>
              </div>

              {/* End Location */}
              <div>
                <label className="block text-white text-sm font-semibold mb-2">End Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEndSearch()}
                    placeholder="Enter destination address"
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3498db]"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEndSearch}
                    disabled={searchingEnd || !endLocation.trim()}
                    className="px-4 py-2 bg-[#3498db] text-white rounded-lg font-semibold hover:bg-[#2980b9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {searchingEnd ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </motion.button>
                </div>
              </div>

              {/* Route Info */}
              {routeInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#3498db]/20 border border-[#3498db]/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">Route Information</p>
                      <p className="text-gray-300 text-sm mt-1">
                        Distance: <span className="text-white font-semibold">{routeInfo.distance} km</span>
                      </p>
                      <p className="text-gray-300 text-sm">
                        Estimated Time: <span className="text-white font-semibold">{routeInfo.time} minutes</span>
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearRoute}
                      className="px-4 py-2 bg-[#e74c3c] text-white rounded-lg font-semibold hover:bg-[#c0392b] transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear Route
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Map Container */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
        >
          <div className="bg-white/5 px-6 py-4 border-b border-white/20">
            <h2 className="text-white text-xl font-semibold flex items-center gap-2">
              <MapPin className="text-[#3498db] w-6 h-6" />
              Interactive Hazard Map
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Click on markers to view detailed information about each hazard
            </p>
          </div>
          
          <div ref={mapRef} className="w-full h-[600px] bg-gray-900"></div>
        </motion.div>

        {/* Hazard List */}
        {potholes.length > 0 && (
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6"
          >
            <h2 className="text-white text-xl font-semibold mb-4">Recent Hazard Reports</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {potholes.slice(0, 10).map((pothole, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{pothole.type || 'Unknown Hazard'}</div>
                      <div className="text-gray-400 text-sm">
                        {new Date(pothole.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      pothole.status === 'reported' ? 'bg-[#e74c3c]/20 text-[#e74c3c]' : 'bg-[#2ecc71]/20 text-[#2ecc71]'
                    }`}>
                      {pothole.status || 'reported'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}