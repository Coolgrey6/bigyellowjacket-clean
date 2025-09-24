import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { globalAttackGenerator } from '../../services/globalAttackGenerator';

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

// Global popup control to ensure only intentional closes happen
let currentOpenMarkerId: string | null = null;
let allowedCloseMarkerId: string | null = null;
let currentOpenMarkerRef: L.Marker | null = null;

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
  const [timeSliderValue, setTimeSliderValue] = useState(0); // Start at 0% (beginning)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x speed
  const [allAttacks, setAllAttacks] = useState<AttackPoint[]>([]);
  const [filteredAttacks, setFilteredAttacks] = useState<AttackPoint[]>([]);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(true);
  const [timelineRange, setTimelineRange] = useState({ min: 0, max: 100 }); // Dynamic range
  const [pausedByMarker, setPausedByMarker] = useState(false); // Track if paused by marker click
  const [markerKey, setMarkerKey] = useState(0); // Force marker re-render
  const [followLatest, setFollowLatest] = useState(false); // Track if following latest marker
  const [forceFollow, setForceFollow] = useState(false); // Track when to force follow
  const [mapViewType, setMapViewType] = useState('street'); // Map view type: street, satellite, terrain, etc.
  const [isPopupOpen, setIsPopupOpen] = useState(false); // Track if any popup is open
  const [currentPopupMarker, setCurrentPopupMarker] = useState<AttackPoint | null>(null); // Track which marker has popup open
  const popupOpenTimeRef = useRef<number | null>(null); // Track when popup was opened
  const [autoAdvance, setAutoAdvance] = useState(true); // Auto-advance to new attacks
  const [isMapPaused, setIsMapPaused] = useState(false); // Track if map is manually paused
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoMoveRef = useRef<number>(0); // Throttle auto-follow map moves
  const autoMoveCooldownMs = 3000; // Minimum pause between auto moves

  // Map tile layer options
  const getTileLayer = (viewType: string) => {
    switch (viewType) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
        };
      case 'terrain':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        };
      case 'dark':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        };
      case 'light':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        };
      case 'watercolor':
        return {
          url: 'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
          attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        };
      default: // street
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors'
        };
    }
  };

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
        
        // Auto-block silently - no alert needed
        console.log(`🚫 Auto-blocked IP ${ip} for country spoofing!`);
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

  // Show ALL attacks - no filtering based on timeline
  const filterAttacksByTime = (attacks: AttackPoint[], timePercentage: number) => {
    if (attacks.length === 0) return attacks;
    
    // Sort attacks by timestamp (newest first for live display)
    const sortedAttacks = [...attacks].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA; // Newest first
    });
    
    // Always return all attacks - no filtering
    return sortedAttacks;
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

  // Listen to global attack generator for real-time updates
  useEffect(() => {
    const handleNewAttack = (newAttack: AttackPoint) => {
      setAllAttacks(prevAttacks => {
        const updated = [newAttack, ...prevAttacks];
        console.log('🔄 Map received new attack:', {
          previous: prevAttacks.length,
          current: updated.length,
          newAttack: {
            ip: newAttack.ip,
            lat: newAttack.lat,
            lon: newAttack.lon,
            severity: newAttack.severity
          }
        });
        
        // Auto-scale timeline: keep slider at current position relative to new data
        if (timeSliderValue >= 95) {
          setTimeSliderValue(100);
        }
        
        // If autoAdvance is enabled, move to new attacks ONLY if no popup is open and map is not paused
        const now = Date.now();
        const canAutoMove = now - (lastAutoMoveRef.current || 0) > autoMoveCooldownMs;
        if (autoAdvance && !isPopupOpen && !isMapPaused && canAutoMove) {
          console.log('🔄 Auto-advance enabled - moving to new attack:', {
            lat: newAttack.lat,
            lon: newAttack.lon,
            ip: newAttack.ip,
            autoAdvance,
            isPopupOpen,
            isMapPaused
          });
          // Trigger map movement to the new attack
          setTimeout(() => {
            // Double-check that map is still not paused before setting forceFollow
            if (!isMapPaused) {
              setForceFollow(true);
              setTimeout(() => setForceFollow(false), 1000);
              // Record last auto move time to throttle further moves
              lastAutoMoveRef.current = Date.now();
            } else {
              console.log('🚫 Skipping forceFollow - map was paused during timeout');
            }
          }, 100);
        } else if (followLatest && !isPopupOpen && !isMapPaused) {
          console.log('🔄 Follow Latest enabled - triggering map movement to new attack:', {
            lat: newAttack.lat,
            lon: newAttack.lon,
            ip: newAttack.ip,
            followLatest,
            isPopupOpen,
            isMapPaused
          });
          // The MapController component will handle the actual movement
        } else if (isMapPaused) {
          console.log('🚫 Map is paused - new attack loaded but map will NOT move:', {
            lat: newAttack.lat,
            lon: newAttack.lon,
            ip: newAttack.ip,
            autoAdvance,
            followLatest,
            isPopupOpen,
            isMapPaused
          });
        } else if (isPopupOpen) {
          console.log('🚫 Popup is open - new attack loaded but map will NOT move:', {
            lat: newAttack.lat,
            lon: newAttack.lon,
            ip: newAttack.ip,
            autoAdvance,
            followLatest,
            isPopupOpen,
            isMapPaused
          });
        } else {
          console.log('🚫 Auto-advance disabled - not moving to new attack:', {
            autoAdvance,
            followLatest,
            isPopupOpen,
            isMapPaused
          });
        }
        
        return updated;
      });
    };

    globalAttackGenerator.addListener(handleNewAttack);

    // Load persisted attacks on mount
    const existingAttacks = globalAttackGenerator.getAllAttacks();
    if (existingAttacks.length > 0) {
      setAllAttacks(existingAttacks);
      console.log('📦 MapView loaded persisted attacks:', existingAttacks.length);
    }

    return () => {
      globalAttackGenerator.removeListener(handleNewAttack);
    };
  }, [timeSliderValue]);

  // Focus on the marker that matches the current timeline position
  const focusOnCurrentMarker = (shouldForceFollow = false) => {
    console.log('🎯 focusOnCurrentMarker called with forceFollow:', shouldForceFollow);
    setForceFollow(shouldForceFollow);
    
    // Reset forceFollow after a short delay
    if (shouldForceFollow) {
      setTimeout(() => setForceFollow(false), 1000);
    }
  };

  // Update filtered attacks when allAttacks or timeSliderValue changes
  useEffect(() => {
    if (allAttacks.length > 0) {
      // Do not update markers/filtered list while a popup is open to avoid remounts that close it
      if (isPopupOpen) {
        console.log('⏸️ Skipping marker updates because a popup is open');
        return;
      }
      const filtered = filterAttacksByTime(allAttacks, timeSliderValue);
      setFilteredAttacks(filtered);
      setMarkers(filtered);
      setMarkerKey(prev => prev + 1);
      
      // Debug: Log marker updates
      console.log('Markers updated:', {
        total: allAttacks.length,
        filtered: filtered.length,
        timeSlider: timeSliderValue,
        markerKey: markerKey + 1,
        followLatest,
        markers: filtered.map(m => ({ 
          lat: m.lat, 
          lon: m.lon, 
          severity: m.severity,
          ip: m.ip,
          attackType: m.attackType,
          timestamp: m.timestamp
        }))
      });
      
      // Follow the latest marker if enabled - MapController will handle this
      if (followLatest && filtered.length > 0) {
        console.log('🔄 Follow Latest enabled - MapController will handle movement');
      }
      
      // DISABLED - Do not auto-focus on markers
      // setTimeout(() => {
      //   focusOnCurrentMarker();
      // }, 100);
    }
  }, [allAttacks, timeSliderValue, isPopupOpen]);

  // Auto-update time slider to show latest attacks when new ones arrive
  useEffect(() => {
    if (allAttacks.length > 0 && !isPlaying) {
      // Auto-advance timeline to show new attacks in real-time
      // Only advance if we're near the end (within 5% of current position)
      if (timeSliderValue >= 95) {
        setTimeSliderValue(100); // Show latest attacks
        // DISABLED - Do not auto-focus on markers
        // setTimeout(() => {
        //   focusOnCurrentMarker();
        // }, 200);
      }
    }
  }, [allAttacks.length, isPlaying, timeSliderValue]);

  // Playback controls
  const startPlayback = () => {
    if (playbackIntervalRef.current) return;
    
    // Don't start playback if a popup is open or map is paused
    if (isPopupOpen) {
      console.log('🚫 Cannot start playback - popup is open');
      return;
    }
    
    if (isMapPaused) {
      console.log('🚫 Cannot start playback - map is paused');
      return;
    }
    
    setIsPlaying(true);
    setPausedByMarker(false); // Reset marker pause state when manually playing
    playbackIntervalRef.current = setInterval(() => {
      // Check again if popup is open or map is paused during playback
      if (isPopupOpen) {
        console.log('🚫 Pausing playback - popup opened during playback');
        setIsPlaying(false);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
        return;
      }
      
      if (isMapPaused) {
        console.log('🚫 Pausing playback - map was paused during playback');
        setIsPlaying(false);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
        return;
      }
      
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
    // Avoid updating markers while a popup is open to keep it visible
    if (isPopupOpen) {
      console.log('⏸️ Skipping marker updates on slider change because a popup is open');
      return;
    }
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
    const now = new Date();
    const timeDiff = now.getTime() - currentTime;
    
    // Show relative time for infinite timeline
    if (timeSliderValue >= 95) {
      return 'Live';
    } else if (timeSliderValue === 0) {
      return 'Start';
    } else if (timeDiff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (timeDiff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(timeDiff / 60000);
      return `${minutes}m ago`;
    } else {
      return currentDate.toLocaleTimeString();
    }
  };

  // Stop playback when popup opens or map is paused
  useEffect(() => {
    if ((isPopupOpen || isMapPaused) && isPlaying) {
      console.log('🚫 Stopping playback due to popup open or map paused');
      stopPlayback();
    }
  }, [isPopupOpen, isMapPaused, isPlaying]);

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

  // Component to handle map movement for follow functionality
  const MapController: React.FC<{ 
    followLatest: boolean; 
    filteredAttacks: AttackPoint[]; 
    forceFollow: boolean;
    isPopupOpen: boolean;
    isMapPaused: boolean;
  }> = ({ followLatest, filteredAttacks, forceFollow, isPopupOpen, isMapPaused }) => {
    const map = useMap();
    
    useEffect(() => {
      console.log('🎮 MapController useEffect triggered:', {
        forceFollow,
        followLatest,
        isMapPaused,
        isPopupOpen,
        filteredAttacksLength: filteredAttacks.length
      });
      
      // Only move the map if explicitly requested (Follow Live button) or if followLatest is enabled
      if (!forceFollow && !followLatest) {
        console.log('🚫 Map movement disabled - forceFollow:', forceFollow, 'followLatest:', followLatest);
        return;
      }
      
    // NEVER move the map if manually paused (unless forceFollow is true)
    if (isMapPaused && !forceFollow) {
      console.log('🚫 Map movement completely disabled - map is manually paused');
      return;
    }
      
      // NEVER move the map if a popup is open - even for force follow
      if (isPopupOpen) {
        console.log('🚫 Map movement completely disabled - popup is open');
        return;
      }
      
      if (filteredAttacks.length > 0) {
        const currentMarker = filteredAttacks[0]; // First marker is the latest
        console.log('🎯 Focusing on marker:', {
          lat: currentMarker.lat,
          lon: currentMarker.lon,
          ip: currentMarker.ip,
          forceFollow,
          followLatest,
          isPopupOpen
        });
        // Throttle map movements to give users time to click
        const now = Date.now();
        if (now - (lastAutoMoveRef.current || 0) < autoMoveCooldownMs) {
          console.log('⏸️ Skipping map flyTo due to cooldown');
          return;
        }
        map.flyTo([currentMarker.lat, currentMarker.lon], 12, {
          duration: 1.5,
          easeLinearity: 0.2
        });
        lastAutoMoveRef.current = now;
        console.log('✅ Map moved to marker');
      } else {
        console.log('❌ No filtered attacks to focus on');
      }
    }, [map, followLatest, filteredAttacks, forceFollow, isPopupOpen, isMapPaused]);
    
    return null;
  };

  const AttackMarkerInner: React.FC<{ p: AttackPoint; isLatest?: boolean; isMapPaused?: boolean; freezeIcon?: boolean; color: string }> = ({ p, isLatest = false, isMapPaused = false, freezeIcon = false, color }) => {
    const map = useMap();
    const markerRef = useRef<L.Marker | null>(null);
    const allowPopupCloseRef = useRef<boolean>(false);
    const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
    const markerId = `${p.ip || 'unknown'}-${p.lat}-${p.lon}`;
    const prevIconRef = useRef<L.DivIcon | null>(null);
    const computedIcon = useMemo(() => {
      // If we need to freeze the icon (to keep popup open), reuse the previous icon instance
      if (freezeIcon && prevIconRef.current) {
        return prevIconRef.current;
      }
      // Visible dot size
      const markerSize = isLatest ? 30 : 20;
      const borderWidth = isLatest ? 4 : 2;
      const fontSize = isLatest ? 16 : 12;
      const shadowIntensity = isLatest ? '0 4px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)';
      // Larger hit area for mouse interactions
      const hitSize = isLatest ? 48 : 36;
      const newIcon = L.divIcon({
        className: `byj-simple-marker ${isLatest ? 'latest-marker' : ''}`,
        html: `<div style="
              width: ${hitSize}px; 
              height: ${hitSize}px; 
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              cursor: pointer;
              position: relative;
            ">
              <div style="
                width: ${markerSize}px; 
                height: ${markerSize}px; 
                background: ${color}; 
                border-radius: 50%; 
                border: ${borderWidth}px solid white; 
                box-shadow: ${shadowIntensity};
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${fontSize}px;
                animation: ${isLatest ? 'pulse 2s infinite' : 'none'};
              ">×</div>
            ${isLatest ? `<div style="
              position: absolute;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              background: #ff6b6b;
              color: white;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            ">LATEST</div>` : ''}
            </div>`,
        iconSize: [hitSize, hitSize],
        iconAnchor: [hitSize/2, hitSize/2],
      });
      prevIconRef.current = newIcon;
      return newIcon;
    }, [freezeIcon, isLatest, color]);
    
    // Debug: Log marker component rendering
    console.log(`AttackMarkerInner rendering:`, {
      lat: p.lat,
      lon: p.lon,
      ip: p.ip,
      severity: p.severity,
      isLatest,
      position: [p.lat, p.lon]
    });
    
    const onClick = () => {
      try { 
        console.log('🎯 Marker clicked:', p.lat, p.lon, p.ip);
        console.log('🎯 Map instance:', map);
        console.log('🎯 Map methods available:', typeof map.flyTo);
        
        // Pause the timeline when clicking a marker
        setIsPlaying(false);
        setPausedByMarker(true);
        
        // Check if map is valid before calling flyTo
        if (map && typeof map.flyTo === 'function') {
          console.log('🎯 Calling map.flyTo with:', [p.lat, p.lon], 15);
          // Zoom in to view the threat actor at street level
          map.flyTo([p.lat, p.lon], 15, {
            duration: 1.5,
            easeLinearity: 0.25
          });
          console.log('✅ map.flyTo called successfully');
        } else {
          console.error('❌ Map instance is invalid or flyTo method not available');
        }
        
        // Add a brief visual feedback
        const mapContainer = map.getContainer();
        if (mapContainer) {
          mapContainer.style.transition = 'all 0.1s ease';
          mapContainer.style.transform = 'scale(0.98)';
          
          // Reset visual feedback
          setTimeout(() => {
            mapContainer.style.transform = 'scale(1)';
            mapContainer.style.transition = 'all 0.3s ease';
          }, 100);
        }
        
        console.log('✅ Marker click handled successfully');
      } catch (error) {
        console.error('Error handling marker click:', error);
      }
    };

    const onMouseOver = () => {
      try {
        console.log('🖱️ Mouse over marker:', p.ip);
        // If another marker popup is open, close it intentionally
        if (currentOpenMarkerId && currentOpenMarkerId !== markerId) {
          console.log('🔁 Switching popup from', currentOpenMarkerId, 'to', markerId);
          allowedCloseMarkerId = currentOpenMarkerId;
          try { currentOpenMarkerRef?.closePopup(); } catch {}
        }
        allowPopupCloseRef.current = false;
        markerRef.current?.openPopup();
        currentOpenMarkerId = markerId;
        currentOpenMarkerRef = markerRef.current;
        allowedCloseMarkerId = null;
        setIsPopupOpen(true);
        setCurrentPopupMarker(p);
      } catch (e) {
        console.warn('Mouse over error:', e);
      }
    };

    const onMouseOut = () => {
      try {
        console.log('🖱️ Mouse out marker:', p.ip);
        // Do not close on mouse out; popup should persist until another marker is hovered
        if (hoverCloseTimerRef.current) {
          clearTimeout(hoverCloseTimerRef.current);
          hoverCloseTimerRef.current = null;
        }
      } catch (e) {
        console.warn('Mouse out error:', e);
      }
    };

    // Use useCallback to prevent recreation on every render
    const onPopupOpen = useCallback(() => {
      try {
        console.log('📋 Popup opening for:', p.lat, p.lon, p.ip);
        console.log('📋 Current state before popup open:', {
          isPopupOpen,
          isMapPaused,
          isPlaying,
          pausedByMarker
        });
        
        // Record the time when popup opens
        popupOpenTimeRef.current = Date.now();
        
        // Pause the timeline when popup opens (no delay needed)
        setIsPlaying(false);
        setPausedByMarker(true);
        setIsPopupOpen(true);
        setCurrentPopupMarker(p); // Track which marker has popup open
        console.log('✅ Popup opened, timeline paused, map paused');
        
        // Move map to the marker with the active popup when map is paused
        if (isMapPaused) {
          console.log('🎯 Moving map to active popup marker when paused:', {
            lat: p.lat,
            lon: p.lon,
            ip: p.ip
          });
          
          // Use the map instance to fly to the marker
          if (mapRef.current) {
            mapRef.current.flyTo([p.lat, p.lon], 15, {
              animate: true,
              duration: 1
            });
          }
        }
      } catch (error) {
        console.error('Error handling popup open:', error);
      }
    }, [p.lat, p.lon, p.ip, isPopupOpen, isMapPaused, isPlaying, pausedByMarker]);

    const onPopupClose = useCallback(() => {
      try {
        console.log('📋 Popup close attempt detected for:', p.lat, p.lon, p.ip);
        console.log('📋 Current state:', { isPopupOpen, isMapPaused, isPlaying, pausedByMarker });
        // Only allow close if this marker has been explicitly allowed (when switching markers)
        if (allowPopupCloseRef.current || allowedCloseMarkerId === markerId) {
          console.log('✅ Allowing popup close');
          if (currentOpenMarkerId === markerId) {
            currentOpenMarkerId = null;
            currentOpenMarkerRef = null;
            allowedCloseMarkerId = null;
            setIsPopupOpen(false);
            setCurrentPopupMarker(null);
          }
          return;
        }
        console.log('🚫 Preventing unintended popup close - reopening');
        // Reopen if not an allowed close
        setTimeout(() => {
          try { markerRef.current?.openPopup(); } catch (e) {}
        }, 0);
      } catch (error) {
        console.error('Error handling popup close:', error);
      }
    }, [p.lat, p.lon, p.ip, isPopupOpen, isMapPaused, isPlaying, pausedByMarker, markerId]);
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
    console.log('🎯 Rendering marker for:', p.lat, p.lon, p.ip, 'with icon:', computedIcon);
    
    return (
      <Marker 
        key={`marker-${p.ip}-${p.lat}-${p.lon}`}
        position={[p.lat, p.lon]} 
        icon={computedIcon} 
        ref={(m) => { markerRef.current = m as any; }}
        eventHandlers={{ click: onClick, popupopen: onPopupOpen, popupclose: onPopupClose, mouseover: onMouseOver, mouseout: onMouseOut }}
        data-marker-ip={p.ip}
      >
        <Popup 
          maxWidth={400} 
          className="byj-detailed-popup" 
          closeButton={false} 
          autoClose={false} 
          keepInView={false}
          closeOnClick={false}
          closeOnEscapeKey={false}
          // Allow popup to close via explicit logic; default onClose not overridden
        >
          <div className="byj-popup">
            <div className="byj-popup-title">
              {p.attackType || 'Attack'} {p.severity ? `(${p.severity})` : ''}
              {isLatest && <span className="latest-badge">LATEST</span>}
              <button 
                className="popup-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Ignore manual close; popups persist until another marker is hovered
                  console.log('🔴 Manual popup close ignored - popup persists until another marker hover');
                }}
                title="Close popup"
              >
                ✕
              </button>
            </div>
            
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

            {/* WiFi Location Tracking Section */}
            {(p as any).wifiLocation && (
              <div className="byj-detail-section byj-wifi-section">
                <div className="byj-section-title">📡 WiFi Location Tracking</div>
                <div className="byj-wifi-summary">
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Accuracy:</span>
                      <span className="byj-detail-value">{(p as any).wifiLocation.estimatedAccuracy.toFixed(1)}m</span>
                    </div>
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Method:</span>
                      <span className="byj-detail-value">{(p as any).wifiLocation.locationMethod.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Confidence:</span>
                      <span className="byj-detail-value">{(p as any).wifiLocation.triangulation.confidence}%</span>
                    </div>
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Sources:</span>
                      <span className="byj-detail-value">{(p as any).wifiLocation.triangulation.sources} APs</span>
                    </div>
                  </div>
                </div>
                
                <div className="byj-access-points">
                  <div className="byj-section-subtitle">📶 Nearby Access Points</div>
                  <div className="byj-ap-list">
                    {(p as any).wifiLocation.accessPoints.slice(0, 3).map((ap: any, idx: number) => (
                      <div key={idx} className="byj-ap-item">
                        <div className="byj-ap-info">
                          <span className="byj-ap-ssid">{ap.ssid || 'Hidden Network'}</span>
                          <span className="byj-ap-bssid">{ap.bssid}</span>
                        </div>
                        <div className="byj-ap-signal">
                          <span className="byj-signal-strength">{ap.signalStrength} dBm</span>
                          <div className="byj-signal-bar">
                            <div 
                              className="byj-signal-fill" 
                              style={{
                                width: `${Math.max(0, (ap.signalStrength + 100) * 2)}%`,
                                backgroundColor: ap.signalStrength > -50 ? '#22c55e' : ap.signalStrength > -70 ? '#f59e0b' : '#ef4444'
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="byj-ap-details">
                          <span className="byj-ap-security">{ap.security}</span>
                          <span className="byj-ap-channel">Ch {ap.channel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Location Details */}
            {(p as any).locationDetails && (
              <div className="byj-detail-section byj-location-section">
                <div className="byj-section-title">📍 Ground Tracking Details</div>
                <div className="byj-location-grid">
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Address:</span>
                      <span className="byj-detail-value">{(p as any).locationDetails.address}</span>
                    </div>
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Building:</span>
                      <span className="byj-detail-value">{(p as any).locationDetails.building}</span>
                    </div>
                  </div>
                  {(p as any).locationDetails.floor !== null && (
                    <div className="byj-detail-row">
                      <div className="byj-detail-item">
                        <span className="byj-detail-label">Floor:</span>
                        <span className="byj-detail-value">{(p as any).locationDetails.floor}</span>
                      </div>
                      {(p as any).locationDetails.room && (
                        <div className="byj-detail-item">
                          <span className="byj-detail-label">Room:</span>
                          <span className="byj-detail-value">{(p as any).locationDetails.room}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Venue:</span>
                      <span className="byj-detail-value">{(p as any).locationDetails.context.venue}</span>
                    </div>
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Environment:</span>
                      <span className="byj-detail-value">{(p as any).locationDetails.context.environment}</span>
                    </div>
                  </div>
                  <div className="byj-detail-row">
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">WiFi Density:</span>
                      <span className="byj-detail-value">{(p as any).locationDetails.context.density}</span>
                    </div>
                    <div className="byj-detail-item">
                      <span className="byj-detail-label">Tracking:</span>
                      <span className={`byj-detail-value ${(p as any).locationDetails.tracking.isActive ? 'byj-status-active' : 'byj-status-inactive'}`}>
                        {(p as any).locationDetails.tracking.isActive ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="byj-popup-actions">
              <button 
                className="byj-track-button"
                onClick={() => {
                  // Zoom in for detailed tracking
                  map.flyTo([p.lat, p.lon], 16, {
                    duration: 1.0,
                    easeLinearity: 0.25
                  });
                }}
                title="Zoom in for detailed tracking"
              >
                🎯 Track Closely
              </button>
            </div>

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
      {/* Global attack generator runs independently */}
      
      {/* Minimized Timeline Button */}
      {isTimelineMinimized && (
        <button 
          className="timeline-minimize-button"
          onClick={() => setIsTimelineMinimized(false)}
          title="Expand Timeline"
        >
          <div className="timeline-minimize-content">
            <div className="timeline-minimize-icon">⏱️</div>
            <div className="timeline-minimize-stats">
              <div className="timeline-minimize-count">{filteredAttacks.length}/{allAttacks.length}</div>
              <div className={`timeline-minimize-status ${timeSliderValue >= 95 ? 'live' : ''} ${pausedByMarker ? 'paused-by-marker' : ''} ${isPopupOpen ? 'paused-by-popup' : ''} ${isMapPaused ? 'paused-by-map' : ''}`}>
                {isMapPaused ? '⏸️' : isPopupOpen ? '⏸️' : pausedByMarker ? '⏸️' : (timeSliderValue >= 95 ? '🔴' : '🔄')}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Time Slider Controls - Expanded */}
      {!isTimelineMinimized && (
        <div className="time-slider-controls expanded">
          <div className="time-slider-header">
            <h3>Attack Timeline</h3>
            <div className="time-info">
              <span>Showing {filteredAttacks.length} of {allAttacks.length} attacks</span>
              <span>Time: {getCurrentTimeDisplay()}</span>
              <span>Last Update: {new Date().toLocaleTimeString()}</span>
              <span className={`sync-status ${timeSliderValue >= 95 ? 'live' : ''} ${pausedByMarker ? 'paused-by-marker' : ''} ${isPopupOpen ? 'paused-by-popup' : ''} ${isMapPaused ? 'paused-by-map' : ''}`}>
                {isMapPaused ? '⏸️ Map Paused (All movement stopped)' : isPopupOpen ? '⏸️ Paused by Popup (New attacks loading)' : pausedByMarker ? '⏸️ Paused by Marker' : (timeSliderValue >= 95 ? '🔴 LIVE' : '🔄 Live Sync')}
              </span>
              <span className="attack-rate">
                Rate: {allAttacks.length > 0 ? Math.round(allAttacks.length / Math.max(1, (Date.now() - new Date(allAttacks[allAttacks.length - 1].timestamp || 0).getTime()) / 60000)) : 0}/min
              </span>
            </div>
            <button 
              className="minimize-button"
              onClick={() => setIsTimelineMinimized(true)}
              title="Minimize Timeline"
            >
              ⬇️
            </button>
          </div>
          
            <div className="time-slider-container">
              <div className="timeline-progress">
                <div className="timeline-bar">
                  <div 
                    className="timeline-fill" 
                    style={{ width: `${timeSliderValue}%` }}
                  ></div>
                  <div className="timeline-marker" style={{ left: `${timeSliderValue}%` }}></div>
                </div>
                <input
                  type="range"
                  min={timelineRange.min}
                  max={timelineRange.max}
                  value={timeSliderValue}
                  onChange={(e) => handleTimeSliderChange(Number(e.target.value))}
                  className="time-slider"
                />
              </div>
              <div className="time-labels">
                <span>Start ({allAttacks.length > 0 ? new Date(allAttacks[allAttacks.length - 1].timestamp || 0).toLocaleTimeString() : 'No data'})</span>
                <span>Live ({allAttacks.length > 0 ? new Date(allAttacks[0].timestamp || 0).toLocaleTimeString() : 'No data'})</span>
              </div>
            </div>
          
          <div className="playback-controls">
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              className={`play-button ${isPlaying ? 'playing' : ''} ${(isPopupOpen || isMapPaused) ? 'disabled' : ''}`}
              disabled={isPopupOpen || isMapPaused}
              title={isPopupOpen ? 'Cannot play while popup is open' : isMapPaused ? 'Cannot play while map is paused' : (isPlaying ? 'Pause timeline' : 'Play timeline')}
            >
              {isPopupOpen ? '⏸️ Paused by Popup' : isMapPaused ? '⏸️ Map Paused' : (isPlaying ? '⏸️ Pause' : '▶️ Play')}
            </button>
            <button onClick={resetPlayback} className="reset-button">
              🔄 Reset
            </button>
            <button 
              onClick={() => {
                // Close any open popup and resume timeline
                setIsPopupOpen(false);
                setPausedByMarker(false);
                setIsPlaying(true);
                setTimeSliderValue(100); // Jump to live
                // Trigger map movement after popup is closed
                setTimeout(() => {
                  setForceFollow(true);
                  setTimeout(() => setForceFollow(false), 1000);
                }, 100);
              }}
              className="follow-live-button"
              title="Follow Live Attacks"
            >
              🔴 Follow Live
            </button>
            <button 
              onClick={() => {
                const map = document.querySelector('.leaflet-container') as any;
                if (map && map._leaflet_id) {
                  // Access the map instance and zoom to world view
                  const leafletMap = (window as any).L?.Map?.get(map._leaflet_id);
                  if (leafletMap) {
                    leafletMap.setView([20, 0], 2, { animate: true, duration: 1.5 });
                  }
                }
              }}
              className="world-view-button"
              title="Zoom to World View"
            >
              🌍 World
            </button>
            <button 
              onClick={() => {
                const newFollowLatest = !followLatest;
                setFollowLatest(newFollowLatest);
                if (newFollowLatest) {
                  // Close any open popup and resume timeline when enabling follow
                  setIsPopupOpen(false);
                  setPausedByMarker(false);
                  setIsPlaying(true);
                  // When enabling follow latest, focus on current marker after popup is closed
                  setTimeout(() => {
                    focusOnCurrentMarker(true);
                  }, 100);
                }
              }} 
              className={`follow-latest-button ${followLatest ? 'active' : ''}`}
              title={followLatest ? 'Stop Following Latest Marker' : 'Follow Latest Marker'}
            >
              {followLatest ? '📍 Following' : '📍 Follow Latest'}
            </button>
            
            <button 
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`auto-advance-button ${autoAdvance ? 'active' : ''} ${(isPopupOpen || isMapPaused) ? 'disabled' : ''}`}
              disabled={isPopupOpen || isMapPaused}
              title={isPopupOpen ? 'Cannot change auto-advance while popup is open' : isMapPaused ? 'Cannot change auto-advance while map is paused' : (autoAdvance ? 'Disable auto-advance to new attacks' : 'Enable auto-advance to new attacks')}
            >
              {isPopupOpen ? '⏸️ Disabled by Popup' : isMapPaused ? '⏸️ Disabled by Pause' : (autoAdvance ? '🚀 Auto-Advance ON' : '⏸️ Auto-Advance OFF')}
            </button>
            
            <button 
              onClick={() => {
                const newPauseState = !isMapPaused;
                console.log('🔄 Pause Map button clicked:', {
                  currentState: isMapPaused,
                  newState: newPauseState,
                  autoAdvance,
                  followLatest,
                  isPlaying
                });
                setIsMapPaused(newPauseState);
                if (newPauseState) {
                  // When pausing map, also stop playback
                  stopPlayback();
                  console.log('⏸️ Map paused - all movement and playback stopped');
                } else {
                  console.log('▶️ Map resumed - movement and playback can continue');
                }
              }}
              className={`pause-map-button ${isMapPaused ? 'paused' : 'active'}`}
              title={isMapPaused ? 'Resume map movement and timeline' : 'Pause all map movement and timeline'}
            >
              {isMapPaused ? '⏸️ Map Paused' : '▶️ Map Active'}
            </button>
            
        <button 
          onClick={() => {
            console.log('🎯 Go to Latest button clicked - moving to latest marker while keeping map paused');
            // Close any open popups
            setIsPopupOpen(false);
            // Move to the latest marker
            if (filteredAttacks.length > 0) {
              const latestMarker = filteredAttacks[0];
              console.log('🎯 Moving to latest marker:', {
                lat: latestMarker.lat,
                lon: latestMarker.lon,
                ip: latestMarker.ip
              });
              // Trigger map movement to latest marker
              setForceFollow(true);
              setTimeout(() => setForceFollow(false), 1000);
            } else {
              console.log('❌ No markers available to move to');
            }
          }}
          className="go-to-latest-button"
          title="Go to latest attack marker while keeping map paused"
        >
          🎯 Go to Latest
        </button>
        
        {/* Go to Popup button - only show when popup is open */}
        {isPopupOpen && currentPopupMarker && (
          <button 
            onClick={() => {
              console.log('📍 Go to Popup button clicked - moving to active popup marker');
              console.log('📍 Moving to popup marker:', {
                lat: currentPopupMarker.lat,
                lon: currentPopupMarker.lon,
                ip: currentPopupMarker.ip
              });
              // Trigger map movement to popup marker
              setForceFollow(true);
              setTimeout(() => setForceFollow(false), 1000);
            }}
            className="go-to-popup-button"
            title={`Go to popup marker: ${currentPopupMarker.ip} (${currentPopupMarker.lat.toFixed(4)}, ${currentPopupMarker.lon.toFixed(4)})`}
          >
            📍 Go to Popup
          </button>
        )}
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

          {/* Map View Type Selector */}
          <div className="map-view-controls">
            <label className="map-view-label">Map View:</label>
            <div className="map-view-buttons">
              <button 
                onClick={() => setMapViewType('street')}
                className={`map-view-button ${mapViewType === 'street' ? 'active' : ''}`}
                title="Street Map"
              >
                🗺️ Street
              </button>
              <button 
                onClick={() => setMapViewType('satellite')}
                className={`map-view-button ${mapViewType === 'satellite' ? 'active' : ''}`}
                title="Satellite View"
              >
                🛰️ Satellite
              </button>
              <button 
                onClick={() => setMapViewType('terrain')}
                className={`map-view-button ${mapViewType === 'terrain' ? 'active' : ''}`}
                title="Terrain View"
              >
                🏔️ Terrain
              </button>
              <button 
                onClick={() => setMapViewType('dark')}
                className={`map-view-button ${mapViewType === 'dark' ? 'active' : ''}`}
                title="Dark Theme"
              >
                🌙 Dark
              </button>
              <button 
                onClick={() => setMapViewType('light')}
                className={`map-view-button ${mapViewType === 'light' ? 'active' : ''}`}
                title="Light Theme"
              >
                ☀️ Light
              </button>
              <button 
                onClick={() => setMapViewType('watercolor')}
                className={`map-view-button ${mapViewType === 'watercolor' ? 'active' : ''}`}
                title="Watercolor Style"
              >
                🎨 Watercolor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Always-visible controls (outside timeline UI) */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
        <button 
          onClick={() => {
            // Toggle follow latest and move immediately
            const newFollowLatest = !followLatest;
            setFollowLatest(newFollowLatest);
            // Close any open popup when enabling follow for clean movement
            if (newFollowLatest) {
              setIsPopupOpen(false);
              setPausedByMarker(false);
              setIsPlaying(true);
              // Force an immediate movement to the latest marker
              setTimeout(() => {
                focusOnCurrentMarker(true);
              }, 50);
            }
          }}
          className={`follow-latest-button ${followLatest ? 'active' : ''}`}
          title={followLatest ? 'Stop Following Latest Marker' : 'Follow Latest Marker'}
        >
          {followLatest ? '📍 Following' : '📍 Follow Latest'}
        </button>

        <button 
          onClick={() => {
            const newPauseState = !isMapPaused;
            setIsMapPaused(newPauseState);
            if (newPauseState) {
              stopPlayback();
            }
          }}
          className={`pause-map-button ${isMapPaused ? 'paused' : 'active'}`}
          title={isMapPaused ? 'Resume map movement and timeline' : 'Pause all map movement and timeline'}
        >
          {isMapPaused ? '⏸️ Map Paused' : '▶️ Map Active'}
        </button>
      </div>

      <MapContainer center={defaultCenter} zoom={5} style={{ height: isTimelineMinimized ? '100vh' : 'calc(100vh - 350px)', width: '100%' }}>
        <TileLayer
          attribution={getTileLayer(mapViewType).attribution}
          url={getTileLayer(mapViewType).url}
        />
        {/* DISABLED - FitToMarkers was causing marker placement issues */}
        {/* <FitToMarkers pts={markers} /> */}
        
        {/* Map controller for follow functionality */}
        <MapController 
          followLatest={followLatest} 
          filteredAttacks={filteredAttacks} 
          forceFollow={forceFollow}
          isPopupOpen={isPopupOpen}
          isMapPaused={isMapPaused}
        />
        
        {markers.map((p, idx) => {
          // Debug: Log each marker being rendered
          console.log(`Rendering marker ${idx}:`, {
            lat: p.lat,
            lon: p.lon,
            ip: p.ip,
            severity: p.severity,
            position: [p.lat, p.lon]
          });
          
          const colorBySeverity: Record<string, string> = {
            critical: '#dc2626',
            high: '#f97316',
            medium: '#f59e0b',
            low: '#16a34a',
          };
          const color = colorBySeverity[(p.severity || '').toLowerCase()] || '#dc2626';
          // Create marker with different sizes for latest vs others
          const isLatest = idx === 0; // First marker is the latest
          // Use markerKey to force re-rendering when markers change
          // Use a stable key while a popup is open to prevent remounting which closes the popup
          const stablePart = `${p.ip || 'unknown'}-${p.lat}-${p.lon}-${p.timestamp || ''}-${idx}`;
          const uniqueKey = isPopupOpen ? stablePart : `${markerKey}-${stablePart}`;
          return <AttackMarkerInner key={uniqueKey} p={p} isLatest={isLatest} isMapPaused={isMapPaused} freezeIcon={isPopupOpen} color={color} />;
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;


