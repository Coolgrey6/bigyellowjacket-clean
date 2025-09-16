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

  // Poll the global every second to reflect live feed updates (simple, robust link)
  useEffect(() => {
    const interval = setInterval(() => {
      const anyWindow = window as any;
      const demo = anyWindow?.BYJ_DEMO_POINTS as AttackPoint[] | undefined;
      if (Array.isArray(demo)) {
        const current = JSON.stringify(markers);
        const next = JSON.stringify(demo);
        if (current !== next) {
          setMarkers(demo);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [markers]);

  const FitToMarkers: React.FC<{ pts: AttackPoint[] }> = ({ pts }) => {
    const map = useMap();
    const applied = useRef<string>('');
    useEffect(() => {
      if (!pts || pts.length === 0) return;
      const key = JSON.stringify(pts.map(p => [p.lat, p.lon]));
      if (applied.current === key) return;
      applied.current = key;
      try {
        if (pts.length === 1) {
          map.setView([pts[0].lat, pts[0].lon], 5, { animate: true });
        } else {
          const bounds = (window as any).L?.latLngBounds
            ? (window as any).L.latLngBounds(pts.map(p => [p.lat, p.lon]))
            : undefined;
          if (bounds) {
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        }
      } catch {
        // ignore
      }
    }, [pts, map]);
    return null;
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
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
          return (
            <Marker key={`${p.lat}-${p.lon}-${idx}`} position={[p.lat, p.lon]} icon={icon}>
              <Popup>
                <div class="byj-popup">
                  <div class="byj-popup-title">{p.attackType || 'Attack'} {p.severity ? `(${p.severity})` : ''}</div>
                  <div><strong>IP:</strong> {p.ip || 'unknown'}{p.port ? `:${p.port}` : ''}</div>
                  {p.protocol && <div><strong>Protocol:</strong> {p.protocol}</div>}
                  {(p.city || p.country) && <div><strong>Location:</strong> {`${p.city || ''}${p.city && p.country ? ', ' : ''}${p.country || ''}`}</div>}
                  {p.timestamp && <div><strong>Time:</strong> {new Date(p.timestamp).toLocaleString()}</div>}
                  <div><strong>Coords:</strong> {p.lat.toFixed(4)}, {p.lon.toFixed(4)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;


