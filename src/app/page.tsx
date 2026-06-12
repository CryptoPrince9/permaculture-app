"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '@/components/NotificationSystem';
import TelemetryIngestion from '../components/TelemetryIngestion';
import MethodologyConfig from '../components/MethodologyConfig';
import ChatInterface from '../components/ChatInterface';
import { Ruler, Maximize } from 'lucide-react';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading Map...</div>
});

// Dynamically import Report to avoid SSR/hydration issues with @react-pdf/renderer
const Report = dynamic(() => import('../components/Report'), {
  ssr: false,
  loading: () => <div className="min-h-[600px] bg-white rounded-3xl flex items-center justify-center text-gray-400">Loading Report Engine...</div>
});

export default function Home() {
  const { notify } = useNotification();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [boundaryCoords, setBoundaryCoords] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [reportLaunched, setReportLaunched] = useState(false);
  const [gmapsLink, setGmapsLink] = useState('');
  const [areaInfo, setAreaInfo] = useState<{ area: number; dimensions: string } | null>(null);
  
  const calculateMetrics = useCallback((coords: Array<{ lat: number, lng: number }>) => {
    if (coords.length < 3) return;

    let sumLat = 0;
    let sumLng = 0;
    coords.forEach(c => {
      sumLat += c.lat;
      sumLng += c.lng;
    });
    const center = { lat: sumLat / coords.length, lng: sumLng / coords.length };

    let calcArea = 0;
    const radius = 6378137;
    const len = coords.length;
    for (let i = 0; i < len; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % len];
      const radLat1 = (p1.lat * Math.PI) / 180;
      const radLat2 = (p2.lat * Math.PI) / 180;
      const radLng1 = (p1.lng * Math.PI) / 180;
      const radLng2 = (p2.lng * Math.PI) / 180;
      calcArea += (radLng2 - radLng1) * (2 + Math.sin(radLat1) + Math.sin(radLat2));
    }
    const area = Math.abs((calcArea * radius * radius) / 2);

    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
    const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111000 * Math.cos((center.lat * Math.PI) / 180);
    const dimensions = `${dLng.toFixed(1)}m x ${dLat.toFixed(1)}m`;

    setAreaInfo({ area, dimensions });
  }, []);

  const handleLocationSelect = useCallback((
    loc: { lat: number; lng: number }, 
    info?: { area: number; dimensions: string } | null,
    coords?: Array<{ lat: number; lng: number }> | null
  ) => {
    setLocation(loc);
    setAreaInfo(info || null);
    setBoundaryCoords(coords || null);
    setReportLaunched(false); // Reset report if location changes
  }, []);

  const handleCreateDefaultBoundary = () => {
    if (!location) return;
    const offsetLat = 0.00045; // ~50m
    const offsetLng = 0.00022; // ~25m
    const defaultBoundary = [
      { lat: location.lat + offsetLat, lng: location.lng - offsetLng },
      { lat: location.lat + offsetLat, lng: location.lng + offsetLng },
      { lat: location.lat - offsetLat, lng: location.lng + offsetLng },
      { lat: location.lat - offsetLat, lng: location.lng - offsetLng },
    ];
    setBoundaryCoords(defaultBoundary);
    calculateMetrics(defaultBoundary);
    notify("Generated default 2,500 m² property boundary.", "success");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const geojson = JSON.parse(text);
          let coords: any[] = [];
          if (geojson.type === 'FeatureCollection') {
            const poly = geojson.features.find((f: any) => f.geometry?.type === 'Polygon');
            if (poly) coords = poly.geometry.coordinates[0];
          } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
            coords = geojson.geometry.coordinates[0];
          } else if (geojson.type === 'Polygon') {
            coords = geojson.coordinates[0];
          }

          if (coords.length >= 3) {
            const parsed = coords.map((c: any) => ({ lat: c[1], lng: c[0] }));
            setBoundaryCoords(parsed);
            calculateMetrics(parsed);
            notify("GeoJSON boundary uploaded successfully!", "success");
          } else {
            notify("No valid Polygon coordinates found in GeoJSON.", "error");
          }
        } else if (file.name.endsWith('.kml')) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          const coordNodes = xmlDoc.getElementsByTagName("coordinates");
          if (coordNodes.length > 0) {
            const coordText = coordNodes[0].textContent || '';
            const pairs = coordText.trim().split(/\s+/);
            const parsed = pairs.map(p => {
              const parts = p.split(',');
              return { lat: parseFloat(parts[1]), lng: parseFloat(parts[0]) };
            }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));

            if (parsed.length >= 3) {
              setBoundaryCoords(parsed);
              calculateMetrics(parsed);
              notify("KML boundary uploaded successfully!", "success");
            } else {
              notify("KML coordinates did not contain enough valid points.", "error");
            }
          } else {
            notify("No <coordinates> tag found in KML file.", "error");
          }
        }
      } catch (err) {
        console.error("File parse error:", err);
        notify("Failed to parse file. Make sure it is valid KML or GeoJSON.", "error");
      }
    };
    reader.readAsText(file);
  };

  const [userData, setUserData] = useState({
    projectName: '',
    clientName: '',
    goals: '',
    budget: '',
  });

  // Local inputs state to prevent heavy react-pdf rendering crashes on keystrokes
  const [localProjectName, setLocalProjectName] = useState('');
  const [localClientName, setLocalClientName] = useState('');
  const [localGoals, setLocalGoals] = useState('');

  // Sync inputs if parent state changes from outside
  useEffect(() => {
    setLocalProjectName(userData.projectName);
  }, [userData.projectName]);

  useEffect(() => {
    setLocalClientName(userData.clientName);
  }, [userData.clientName]);

  useEffect(() => {
    setLocalGoals(userData.goals);
  }, [userData.goals]);

  const [config, setConfig] = useState({ methodology: 'Syntropic Agroforestry', financialStrategy: [] });

  const handleGmapsLink = async () => {
    const input = gmapsLink.trim();
    if (!input) return;

    // Reset area info on new manual search
    setAreaInfo(null);

    // 1. Try to match degrees/minutes/seconds (DMS) format: e.g. 14°27'30.9"N 16°00'45.7"W, support smart quotes, primes, etc.
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*['’′\s]\s*(\d+(?:\.\d+)?)\s*["”″\s]\s*([NSEW])/gi;
    const matches = [...input.matchAll(dmsRegex)];
    if (matches.length >= 2) {
      const parseDMSMatch = (match: RegExpExecArray) => {
        const degrees = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        const direction = match[4].toUpperCase();
        let decimal = degrees + minutes / 60 + seconds / 3600;
        if (direction === 'S' || direction === 'W') {
          decimal = -decimal;
        }
        return decimal;
      };
      
      const lat = parseDMSMatch(matches[0]);
      const lng = parseDMSMatch(matches[1]);
      setLocation({ lat, lng });
      notify(`Located DMS coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, "success");
      return;
    }

    // 2. Try to match standard raw decimal coordinates: "lat, lng" or "lat lng"
    const rawCoordsRegex = /^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/;
    const rawMatch = input.match(rawCoordsRegex);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      setLocation({ lat, lng });
      notify(`Located decimal coordinates: ${lat}, ${lng}`, "success");
      return;
    }

    // 3. Try to check if it's a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const gmapsCoordsRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const qCoordsRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const generalCoordsRegex = /(-?\d+\.\d+),(-?\d+\.\d+)/;
      
      let urlMatch = input.match(gmapsCoordsRegex) || input.match(qCoordsRegex) || input.match(generalCoordsRegex);
      if (urlMatch) {
        const lat = parseFloat(urlMatch[1]);
        const lng = parseFloat(urlMatch[2]);
        setLocation({ lat, lng });
        notify(`Located from URL: ${lat}, ${lng}`, "success");
        return;
      }
      
      try {
        notify("Shortened Google Maps link detected. Resolving location...", "info");
        const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(input)}`);
        const data = await res.json();
        
        if (res.ok && data.lat && data.lng) {
          setLocation({ lat: data.lat, lng: data.lng });
          notify(`Located from shortened link: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`, "success");
        } else {
          notify(data.error || "Failed to resolve coordinates from the shortened link.", "error");
        }
      } catch (err) {
        console.error("Resolve error:", err);
        notify("Network error occurred while resolving shortened link.", "error");
      }
      return;
    }

    // 4. Try to geocode general physical text address securely on the server side
    try {
      notify(`Searching address: "${input}"...`, "info");
      const res = await fetch(`/api/resolve-maps?q=${encodeURIComponent(input)}`);
      const data = await res.json();
      
      if (res.ok && data.lat && data.lng) {
        setLocation({ lat: data.lat, lng: data.lng });
        notify(`Located: "${data.displayName ? data.displayName.split(',')[0] : input}" (${data.lat.toFixed(6)}, ${data.lng.toFixed(6)})`, "success");
      } else {
        notify(data.error || "Could not find that address. Please check spelling or enter precise coordinates.", "error");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      notify("Network error occurred while searching for the address.", "error");
    }
  };

  return (
    <main className="min-h-screen p-8 text-foreground">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter text-primary">
            Permaculture <span className="text-accent italic">Intelligence</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
            Generate professional site reports using real-world ecological, climatic, and geological data.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <section className="glass-panel p-6 rounded-2xl border border-white/40">
              <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                Location Intelligence
              </h2>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Paste Google Maps Link or Coordinates"
                  className="flex-1 bg-white/50 backdrop-blur-sm p-3 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none shadow-inner"
                  value={gmapsLink}
                  onChange={(e) => setGmapsLink(e.target.value)}
                />
                <button
                  onClick={handleGmapsLink}
                  className="bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-all shadow-lg hover:shadow-primary/20"
                >
                  Locate
                </button>
              </div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-white/50 relative">
                <Map 
                  onLocationSelect={handleLocationSelect} 
                  location={location} 
                  boundaryCoords={boundaryCoords}
                />
              </div>

              {location && (
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateDefaultBoundary}
                      className="flex-1 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 text-primary py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center text-[10px] md:text-xs"
                    >
                      💡 Default 2,500m² Box
                    </button>
                    
                    <label className="flex-1 bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/15 hover:to-accent/10 border border-accent/20 text-accent py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5 text-[10px] md:text-xs">
                      📤 Upload KML / GeoJSON
                      <input 
                        type="file" 
                        accept=".kml,.geojson,.json" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                      />
                    </label>
                  </div>
                  
                  {boundaryCoords && (
                    <button
                      onClick={() => {
                        setBoundaryCoords(null);
                        setAreaInfo(null);
                        notify("Boundary drawing cleared.", "info");
                      }}
                      className="w-full text-center text-red-500 hover:text-red-600 text-xs font-bold uppercase tracking-widest cursor-pointer py-1"
                    >
                      Clear Boundary Shape
                    </button>
                  )}
                </div>
              )}

              {/* High-Tech HUD for Area Metrics and Estimations */}
              {areaInfo && (
                <div className="mt-4 p-4.5 bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-2xl space-y-3 shadow-md animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-primary/15 pb-2">
                    <Ruler className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Selected Site Metrics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-tight">Total Calculated Area</span>
                      <span className="text-sm font-black text-primary flex items-baseline gap-1">
                        {areaInfo.area >= 10000 
                          ? `${(areaInfo.area / 10000).toFixed(3)} ha` 
                          : `${Math.round(areaInfo.area).toLocaleString()} m²`}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-tight">Site Dimensions</span>
                      <span className="text-sm font-black text-primary flex items-baseline gap-1">
                        <Maximize className="w-3.5 h-3.5 text-accent shrink-0" />
                        {areaInfo.dimensions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <TelemetryIngestion onStreamComplete={(coords) => setLocation(coords[0])} />
            </section>

            <section className="glass-panel p-6 rounded-2xl border border-white/40">
              <h2 className="text-xl font-bold mb-4 text-primary">Project Identity</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Project Name"
                  className="w-full bg-white/50 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-accent border border-gray-100"
                  value={localProjectName}
                  onChange={(e) => setLocalProjectName(e.target.value)}
                  onBlur={() => setUserData(prev => ({ ...prev, projectName: localProjectName }))}
                  onKeyDown={(e) => e.key === 'Enter' && setUserData(prev => ({ ...prev, projectName: localProjectName }))}
                />
                <input
                  type="text"
                  placeholder="Client Name"
                  className="w-full bg-white/50 p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-accent border border-gray-100"
                  value={localClientName}
                  onChange={(e) => setLocalClientName(e.target.value)}
                  onBlur={() => setUserData(prev => ({ ...prev, clientName: localClientName }))}
                  onKeyDown={(e) => e.key === 'Enter' && setUserData(prev => ({ ...prev, clientName: localClientName }))}
                />
                <textarea
                  placeholder="Goals & Vision"
                  className="w-full bg-white/50 p-3 rounded-xl text-sm h-24 outline-none focus:ring-1 focus:ring-accent resize-none border border-gray-100"
                  value={localGoals}
                  onChange={(e) => setLocalGoals(e.target.value)}
                  onBlur={() => setUserData(prev => ({ ...prev, goals: localGoals }))}
                />
              </div>
            </section>

            <MethodologyConfig location={location} onConfigChange={setConfig} />
            
            <ChatInterface />
          </div>

          <div className="lg:col-span-8">
            <div className="glass-panel rounded-3xl p-6 min-h-[600px] shadow-2xl border border-white/20 flex flex-col">
              {reportLaunched && location ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setReportLaunched(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      ← Modify Boundaries / Details
                    </button>
                  </div>
                  <Report location={location} boundaryCoords={boundaryCoords} userData={userData} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-6 select-none animate-fade-in">
                  <div className="w-24 h-24 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner animate-pulse">
                    <Ruler className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Generate PDC Report</h3>
                    <p className="text-gray-500 text-sm leading-relaxed font-light">
                      Set coordinates, define the site borders (draw on the map or upload a KML/GeoJSON file), and fill in project details to run the GIS orchestration.
                    </p>
                  </div>

                  <div className="w-full max-w-sm bg-white/50 border border-gray-100 rounded-2xl p-4 text-left space-y-3.5 shadow-sm text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${location ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-primary/10 text-primary'}`}>{location ? '✓' : '1'}</span>
                      <span className={location ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}>Set site coordinates (Locate pin)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${boundaryCoords ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-primary/10 text-primary'}`}>{boundaryCoords ? '✓' : '2'}</span>
                      <span className={boundaryCoords ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}>Draw borders or upload KML/GeoJSON</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${userData.projectName && userData.clientName ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-primary/10 text-primary'}`}>{userData.projectName && userData.clientName ? '✓' : '3'}</span>
                      <span className={userData.projectName && userData.clientName ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}>Provide project details (left pane)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!location) {
                        notify("Please set the coordinates by clicking 'Locate' or dropping a pin first.", "error");
                        return;
                      }
                      if (!boundaryCoords || boundaryCoords.length === 0) {
                        notify("Please draw a boundary, upload a KML, or click 'Default 2,500m² Box'.", "error");
                        return;
                      }
                      if (!userData.projectName || !userData.clientName) {
                        notify("Please fill in Project Name and Client Name under Project Identity.", "error");
                        return;
                      }
                      setReportLaunched(true);
                      notify("Orchestrating PDC Landscape report...", "info");
                    }}
                    disabled={!location || !boundaryCoords || !userData.projectName || !userData.clientName}
                    className={`w-full max-w-xs py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl cursor-pointer active:scale-95 ${(!location || !boundaryCoords || !userData.projectName || !userData.clientName) ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none' : 'bg-accent text-white hover:scale-105 shadow-accent/20'}`}
                  >
                    🚀 Orchestrate PDC GIS Pipeline
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
