import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './liveMap.css'; // optional small tweaks (e.g. .lf-custom-divicon)

function createCircleIcon(color = '#007bff', size = 28) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
    </svg>
  `.trim();

  return L.divIcon({
    html: svg,
    className: 'lf-custom-divicon',
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), Math.floor(size / 2)],
    popupAnchor: [0, -Math.floor(size / 2) - 6]
  });
}

/**
 * LiveMap
 * Props:
 *  - locations: { userId: { userId, username, name, lat, lng, accuracy, ts } }
 *  - myId: optional id string for "me"
 */
export default function LiveMap({ locations = {}, myId = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { preferCanvas: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      // proper cleanup on unmount
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers that are no longer in locations
    const wanted = new Set(Object.keys(locations || {}));
    Object.keys(markersRef.current).forEach(id => {
      if (!wanted.has(id)) {
        try { map.removeLayer(markersRef.current[id]); } catch (e) {}
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    Object.keys(locations).forEach(uid => {
      const p = locations[uid];
      if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;

      const isMe = (myId && String(uid) === String(myId)) || (!myId && uid === 'me');
      const color = isMe ? '#28a745' : '#007bff';
      const icon = createCircleIcon(color, isMe ? 34 : 28);

      const titleText = p.name || p.username || 'Unknown';
      const popupHtml = `
        <div style="font-weight:700;margin-bottom:6px">${titleText}</div>
        <div style="font-size:12px;color:#444">Last: ${new Date(p.ts).toLocaleString()}</div>
        ${p.accuracy ? `<div style="font-size:12px;color:#555">Accuracy: ${Math.round(p.accuracy)} m</div>` : ''}
      `;

      if (markersRef.current[uid]) {
        // update existing marker
        const m = markersRef.current[uid];
        m.setLatLng([p.lat, p.lng]);
        m.setIcon(icon);
        if (m.getPopup()) m.getPopup().setContent(popupHtml);
        const t = m.getTooltip && m.getTooltip();
        if (t) t.setContent(titleText);
      } else {
        // create new marker
        const m = L.marker([p.lat, p.lng], {
          icon,
          title: titleText,
          alt: titleText,
          riseOnHover: true
        }).addTo(map);

        m.bindTooltip(titleText, { direction: 'top', offset: [0, -12], opacity: 0.9 });
        m.bindPopup(popupHtml, { minWidth: 160 });

        markersRef.current[uid] = m;
      }
    });

    // Optional: fit bounds to markers 
    const allCoords = Object.values(locations).map(p => [p.lat, p.lng]);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds.pad(0.2), { maxZoom: 16, animate: true });
    }

  }, [locations, myId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
