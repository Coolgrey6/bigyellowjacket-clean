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

  const AttackMarkerInner: React.FC<{ p: AttackPoint; icon: L.DivIcon }> = ({ p, icon }) => {
    const map = useMap();
    const onClick = () => {
      try { map.flyTo([p.lat, p.lon], 8, { animate: true }); } catch {}
    };
    const spoof = isPointInCountry(p.lat, p.lon, p.country);
    const kartaview = `https://kartaview.org/map/@${p.lat},${p.lon},17z`;
    const mapillary = `https://www.mapillary.com/app/?lat=${p.lat}&lng=${p.lon}&z=17`;
    const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;
    return (
      <Marker position={[p.lat, p.lon]} icon={icon} eventHandlers={{ click: onClick }}>
        <Popup>
          <div className="byj-popup">
            <div className="byj-popup-title">{p.attackType || 'Attack'} {p.severity ? `(${p.severity})` : ''}</div>
            <div><strong>IP:</strong> {p.ip || 'unknown'}{p.port ? `:${p.port}` : ''}</div>
            {p.protocol && <div><strong>Protocol:</strong> {p.protocol}</div>}
            {(p.city || p.country) && <div><strong>Location:</strong> {`${p.city || ''}${p.city && p.country ? ', ' : ''}${p.country || ''}`}</div>}
            {p.timestamp && <div><strong>Time:</strong> {new Date(p.timestamp).toLocaleString()}</div>}
            <div><strong>Coords:</strong> {p.lat.toFixed(4)}, {p.lon.toFixed(4)}</div>
            {typeof spoof !== 'undefined' && (
              <div className={`byj-spoof ${spoof ? 'ok' : 'warn'}`}>
                {spoof ? 'Country match' : 'Potential country spoofing'}
              </div>
            )}
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
          return <AttackMarkerInner key={`${p.lat}-${p.lon}-${idx}`} p={p} icon={icon} />;
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;


