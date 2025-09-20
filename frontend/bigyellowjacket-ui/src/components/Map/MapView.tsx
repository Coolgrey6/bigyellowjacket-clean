import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix default icon paths for Leaflet in bundlers
import L from 'leaflet';
// @ts-ignore - images are handled by bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type AttackPoint = {
  lat: number;
  lon: number;
  label?: string;
  ip?: string;
  attackType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | string;
  city?: string;
  country?: string;
  timestamp?: string;
  status?: string;
  port?: number;
  protocol?: string;
};

interface MapViewProps { points?: AttackPoint[] }

export const MapView: React.FC<MapViewProps> = ({ points }) => {
  const defaultCenter: [number, number] = [37.7749, -122.4194];
  
  // Time slider state
  const [timeSliderValue, setTimeSliderValue] = useState(100); // 0-100 percentage
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x speed
  const [allAttacks, setAllAttacks] = useState<AttackPoint[]>([]);
  const [filteredAttacks, setFilteredAttacks] = useState<AttackPoint[]>([]);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Minimal country bounding boxes for spoof-check demo (expand as needed)
  const countryBoxes: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
    'United States': { minLat: 24.396308, maxLat: 49.384358, minLon: -124.848974, maxLon: -66.885444 },
    Canada: { minLat: 41.676555, maxLat: 83.113881, minLon: -141.0, maxLon: -52.619408 },
    China: { minLat: 18.0, maxLat: 53.56, minLon: 73.6, maxLon: 134.77 },
    Russia: { minLat: 41.19, maxLat: 81.86, minLon: 19.64, maxLon: 180.0 },
    Germany: { minLat: 47.27, maxLat: 55.06, minLon: 5.87, maxLon: 15.04 },
    'United Kingdom': { minLat: 49.86, maxLat: 60.86, minLon: -8.65, maxLon: 1.78 },
    Japan: { minLat: 24.25, maxLat: 45.52, minLon: 122.94, maxLon: 153.99 },
    Brazil: { minLat: -33.75, maxLat: 5.27, minLon: -73.99, maxLon: -28.85 },
    India: { minLat: 6.55, maxLat: 35.67, minLon: 68.11, maxLon: 97.4 },
    France: { minLat: 41.33, maxLat: 51.09, minLon: -5.14, maxLon: 9.56 },
    Netherlands: { minLat: 50.75, maxLat: 53.7, minLon: 3.36, maxLon: 7.23 },
    Australia: { minLat: -43.64, maxLat: -10.67, minLon: 112.91, maxLon: 153.64 },
  };

  const isPointInCountry = (lat: number, lon: number, country?: string): boolean | undefined => {
    if (!country) return undefined;
    const box = countryBoxes[country];
    if (!box) return undefined; // unknown country
    return lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon;
  };

  // Auto-block IPs showing country spoofing
  const autoBlockSpoofedIP = async (ip: string, reason: string) => {
    try {
      console.log(`🚫 Auto-blocking spoofed IP: ${ip} - Reason: ${reason}`);
      
      // Send block request to API
      const response = await fetch('/api/threats/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: ip,
          duration: 3600, // 1 hour
          reason: `Auto-blocked: ${reason}`,
          auto_blocked: true,
          spoofing_detected: true
        })
      });

      if (response.ok) {
        console.log(`✅ Successfully auto-blocked IP: ${ip}`);
        
        // Update global blocked IPs list
        const anyWindow = window as any;
        if (!anyWindow.BYJ_BLOCKED_IPS) {
          anyWindow.BYJ_BLOCKED_IPS = [];
        }
        anyWindow.BYJ_BLOCKED_IPS.push({
          ip: ip,
          reason: reason,
          timestamp: new Date().toISOString(),
          auto_blocked: true
        });
        
        // Show notification
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`🚫 Auto-blocked IP ${ip} for country spoofing!`);
        }
      } else {
        console.error(`❌ Failed to auto-block IP: ${ip}`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error auto-blocking IP ${ip}:`, error);
    }
  };

  // Check for spoofing and auto-block if detected
  const checkAndBlockSpoofing = (attack: AttackPoint) => {
    if (!attack.ip || !attack.country) return;
    
    const isInCountry = isPointInCountry(attack.lat, attack.lon, attack.country);
    
    // If coordinates don't match the claimed country, it's spoofing
    if (isInCountry === false) {
      const reason = `Country spoofing detected: Claimed ${attack.country} but coordinates (${attack.lat}, ${attack.lon}) don't match`;
      autoBlockSpoofedIP(attack.ip, reason);
    }
  };

  // Time filtering function based on actual timestamps
  const filterAttacksByTime = (attacks: AttackPoint[], timePercentage: number) => {
    if (attacks.length === 0) return attacks;
    
    // Sort attacks by timestamp
    const sortedAttacks = [...attacks].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    
    if (sortedAttacks.length === 0) return attacks;
    
    // Get time range
    const firstTime = new Date(sortedAttacks[0].timestamp || 0).getTime();
    const lastTime = new Date(sortedAttacks[sortedAttacks.length - 1].timestamp || 0).getTime();
    const timeRange = lastTime - firstTime;
    
    // Calculate cutoff time based on percentage
    const cutoffTime = firstTime + (timeRange * timePercentage / 100);
    
    // Filter attacks that occurred before or at the cutoff time
    return sortedAttacks.filter(attack => {
      const attackTime = new Date(attack.timestamp || 0).getTime();
      return attackTime <= cutoffTime;
    });
  };

  // Pull any demo lat/lon data exposed on window for quick integration
  const initialMarkers: AttackPoint[] = useMemo(() => {
    if (points && points.length > 0) return points;
    const anyWindow = window as any;
    const demo = anyWindow?.BYJ_DEMO_POINTS as AttackPoint[] | undefined;
    if (Array.isArray(demo) && demo.length > 0) return demo;
    return [
      { lat: 37.7749, lon: -122.4194, label: 'San Francisco (demo)' },
    ];
  }, [points]);

  const [markers, setMarkers] = useState<AttackPoint[]>(initialMarkers);

  // Poll the global every 500ms to reflect live feed updates (faster sync)
  useEffect(() => {
    const interval = setInterval(() => {
      const anyWindow = window as any;
      const demo = anyWindow?.BYJ_DEMO_POINTS as AttackPoint[] | undefined;
      if (Array.isArray(demo) && demo.length > 0) {
        // Store all attacks for time slider
        setAllAttacks(prevAttacks => {
          // Check if we have new attacks by comparing lengths and last attack
          const hasNewAttacks = prevAttacks.length !== demo.length || 
            (prevAttacks.length > 0 && demo.length > 0 && 
             prevAttacks[0].timestamp !== demo[0].timestamp);
          
          if (hasNewAttacks) {
            console.log('🔄 New attacks detected, updating timeline:', demo.length, 'attacks');
            return demo;
          }
          return prevAttacks;
        });
      }
    }, 500); // Faster polling for better sync
    return () => clearInterval(interval);
  }, []);

  // Update filtered attacks when allAttacks or timeSliderValue changes
  useEffect(() => {
    if (allAttacks.length > 0) {
      const filtered = filterAttacksByTime(allAttacks, timeSliderValue);
      setFilteredAttacks(filtered);
      setMarkers(filtered);
    }
  }, [allAttacks, timeSliderValue]);

  // Auto-update time slider to show latest attacks when new ones arrive
  useEffect(() => {
    if (allAttacks.length > 0 && !isPlaying) {
      // If we're at 100% and new attacks arrive, stay at 100%
      // If we're not at 100%, we can optionally auto-advance
      // For now, let's keep the current position unless user is at 100%
      if (timeSliderValue >= 95) {
        setTimeSliderValue(100);
      }
    }
  }, [allAttacks.length, isPlaying, timeSliderValue]);

  // Playback controls
  const startPlayback = () => {
    if (playbackIntervalRef.current) return;
    
    setIsPlaying(true);
    playbackIntervalRef.current = setInterval(() => {
      setTimeSliderValue(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
          }
          return 100;
        }
        return prev + (playbackSpeed * 0.5); // Adjust speed
      });
    }, 100); // Update every 100ms
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const resetPlayback = () => {
    stopPlayback();
    setTimeSliderValue(0);
  };

  // Handle time slider change
  const handleTimeSliderChange = (value: number) => {
    setTimeSliderValue(value);
    const filtered = filterAttacksByTime(allAttacks, value);
    setFilteredAttacks(filtered);
    setMarkers(filtered);
  };

  // Get current time display for the slider
  const getCurrentTimeDisplay = () => {
    if (allAttacks.length === 0) return 'No attacks';
    
    const sortedAttacks = [...allAttacks].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    
    if (sortedAttacks.length === 0) return 'No attacks';
    
    const firstTime = new Date(sortedAttacks[0].timestamp || 0).getTime();
    const lastTime = new Date(sortedAttacks[sortedAttacks.length - 1].timestamp || 0).getTime();
    const timeRange = lastTime - firstTime;
    const currentTime = firstTime + (timeRange * timeSliderValue / 100);
    
    const currentDate = new Date(currentTime);
    const firstDate = new Date(firstTime);
    const lastDate = new Date(lastTime);
    
    if (timeSliderValue === 0) {
      return firstDate.toLocaleTimeString();
    } else if (timeSliderValue === 100) {
      return lastDate.toLocaleTimeString();
    } else {
      return currentDate.toLocaleTimeString();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const FitToMarkers: React.FC<{ pts: AttackPoint[] }> = ({ pts }) => {
    const map = useMap();
    const applied = useRef<string>('');
    const isInitialLoad = useRef(true);
    
    useEffect(() => {
      if (!pts || pts.length === 0) return;
      
      const key = JSON.stringify(pts.map(p => [p.lat, p.lon]));
      if (applied.current === key) return;
      
      // Only auto-fit on initial load, not on every update
      if (!isInitialLoad.current) return;
      
      applied.current = key;
      isInitialLoad.current = false;
      
      try {
        if (pts.length === 1) {
          map.setView([pts[0].lat, pts[0].lon], 8, { animate: true, duration: 1 });
        } else if (pts.length > 1) {
          const bounds = (window as any).L?.latLngBounds
            ? (window as any).L.latLngBounds(pts.map(p => [p.lat, p.lon]))
            : undefined;
          if (bounds) {
            map.fitBounds(bounds, { 
              padding: [50, 50],
              animate: true,
              duration: 1
            });
          }
        }
      } catch (error) {
        console.warn('Map bounds error:', error);
      }
    }, [pts, map]);
    
    return null;
  };

  const AttackMarkerInner: React.FC<{ p: AttackPoint; icon: L.DivIcon }> = ({ p, icon }) => {
    const map = useMap();
    const onClick = () => {
      try { map.flyTo([p.lat, p.lon], 8, { animate: true }); } catch {}
    };
    const spoof = isPointInCountry(p.lat, p.lon, p.country);
    
    // Check for spoofing and auto-block if detected (with delay)
    React.useEffect(() => {
      // Delay blocking so attacks can be seen on map first
      const timer = setTimeout(() => {
        checkAndBlockSpoofing(p);
      }, 3000); // 3 second delay
      
      return () => clearTimeout(timer);
    }, [p.ip, p.country, p.lat, p.lon]);
    
    const kartaview = `https://kartaview.org/map/@${p.lat},${p.lon},17z`;
    const mapillary = `https://www.mapillary.com/app/?lat=${p.lat}&lng=${p.lon}&z=17`;
    const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;
    return (
      <Marker position={[p.lat, p.lon]} icon={icon} eventHandlers={{ click: onClick }}>
        <Popup maxWidth={400} className="byj-detailed-popup">
          <div className="byj-popup">
            <div className="byj-popup-title">{p.attackType || 'Attack'} {p.severity ? `(${p.severity})` : ''}</div>
            
            {/* Basic Attack Info */}
            <div className="byj-detail-section">
              <div className="byj-detail-row">
                <div className="byj-detail-item">
                  <span className="byj-detail-label">IP Address:</span>
                  <span className="byj-detail-value">{p.ip || 'unknown'}{p.port ? `:${p.port}` : ''}</span>
                </div>
                <div className="byj-detail-item">
                  <span className="byj-detail-label">Protocol:</span>
                  <span className="byj-detail-value">{p.protocol || 'Unknown'}</span>
                </div>
              </div>
              
              <div className="byj-detail-row">
                <div className="byj-detail-item">
                  <span className="byj-detail-label">Location:</span>
                  <span className="byj-detail-value">{`${p.city || ''}${p.city && p.country ? ', ' : ''}${p.country || ''}`}</span>
                </div>
                <div className="byj-detail-item">
                  <span className="byj-detail-label">Coordinates:</span>
                  <span className="byj-detail-value">{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</span>
                </div>
              </div>
              
              <div className="byj-detail-row">
                <div className="byj-detail-item">
                  <span className="byj-detail-label">Timestamp:</span>
                  <span className="byj-detail-value">{p.timestamp ? new Date(p.timestamp).toLocaleString() : 'Unknown'}</span>
                </div>
                <div className="byj-detail-item">
                  <span className="byj-detail-label">Status:</span>
                  <span className={`byj-detail-value byj-status-${p.status || 'unknown'}`}>{p.status || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* MAC Address Info (if available) */}
            {(p as any).mac && (
              <div className="byj-detail-section">
                <div className="byj-detail-row">
                  <div className="byj-detail-item">
                    <span className="byj-detail-label">MAC Address:</span>
                    <span className="byj-detail-value font-mono">{((p as any).mac as any).address}</span>
                  </div>
                  <div className="byj-detail-item">
                    <span className="byj-detail-label">Vendor:</span>
                    <span className="byj-detail-value">{((p as any).mac as any).vendor || 'Unknown'}</span>
                  </div>
                </div>
                <div className="byj-detail-row">
                  <div className="byj-detail-item">
                    <span className="byj-detail-label">MAC Type:</span>
                    <span className="byj-detail-value">
                      {((p as any).mac as any).isLocal ? 'Local' : 'Global'}
                      {((p as any).mac as any).isMulticast && ' | Multicast'}
                      {((p as any).mac as any).isBroadcast && ' | Broadcast'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Attack Details */}
            {(p as any).bytesTransferred && (
              <div className="byj-detail-section">
                <div className="byj-detail-row">
                  <div className="byj-detail-item">
                    <span className="byj-detail-label">Data Transferred:</span>
                    <span className="byj-detail-value">{((p as any).bytesTransferred / 1024).toFixed(2)} KB</span>
                  </div>
                  <div className="byj-detail-item">
                    <span className="byj-detail-label">Duration:</span>
                    <span className="byj-detail-value">{((p as any).duration || 0)}s</span>
                  </div>
                </div>
                {(p as any).confidence_score && (
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Confidence:</span>
                      <span className="byj-detail-value">{((p as any).confidence_score || 0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Country Spoofing Check */}
            {typeof spoof !== 'undefined' && (
              <div className={`byj-spoof ${spoof ? 'ok' : 'warn'}`}>
                {spoof ? '✅ Country match' : '⚠️ Potential country spoofing'}
              </div>
            )}

            {/* Street View Links */}
            <div className="byj-links">
              <a href={kartaview} target="_blank" rel="noreferrer">Street (KartaView)</a>
              <a href={mapillary} target="_blank" rel="noreferrer">Street (Mapillary)</a>
              <a href={osm} target="_blank" rel="noreferrer">Open in OSM</a>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Time Slider Controls */}
      <div className={`time-slider-controls ${isTimelineMinimized ? 'minimized' : ''}`}>
        <div className="time-slider-header">
          <h3>Attack Timeline</h3>
          <div className="time-info">
            <span>Showing {filteredAttacks.length} of {allAttacks.length} attacks</span>
            <span>Time: {getCurrentTimeDisplay()}</span>
            <span>Last Update: {new Date().toLocaleTimeString()}</span>
            <span className="sync-status">🔄 Live Sync</span>
          </div>
          <button 
            className="minimize-button"
            onClick={() => setIsTimelineMinimized(!isTimelineMinimized)}
            title={isTimelineMinimized ? 'Expand Timeline' : 'Minimize Timeline'}
          >
            {isTimelineMinimized ? '⬆️' : '⬇️'}
          </button>
        </div>
        
        {!isTimelineMinimized && (
          <>
            <div className="time-slider-container">
              <input
                type="range"
                min="0"
                max="100"
                value={timeSliderValue}
                onChange={(e) => handleTimeSliderChange(Number(e.target.value))}
                className="time-slider"
              />
              <div className="time-labels">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
            
            <div className="playback-controls">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`play-button ${isPlaying ? 'playing' : ''}`}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button onClick={resetPlayback} className="reset-button">
                🔄 Reset
              </button>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="speed-select"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </>
        )}
      </div>

      <MapContainer center={defaultCenter} zoom={5} style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers pts={markers} />
        {markers.map((p, idx) => {
          const colorBySeverity: Record<string, string> = {
            critical: '#dc2626',
            high: '#f97316',
            medium: '#f59e0b',
            low: '#16a34a',
          };
          const color = colorBySeverity[(p.severity || '').toLowerCase()] || '#dc2626';
          const icon = L.divIcon({
            className: 'byj-attack-icon-wrapper',
            html: `<div class="byj-attack-icon" style="background:${color}">×</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          return <AttackMarkerInner key={`${p.lat}-${p.lon}-${idx}`} p={p} icon={icon} />;
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;


