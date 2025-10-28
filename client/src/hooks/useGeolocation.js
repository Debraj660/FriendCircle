import { useEffect } from 'react';

export default function useGeolocation(onPosition) {
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let id = null;
    id = navigator.geolocation.watchPosition(pos => {
      onPosition(pos);
    }, (err) => console.error('geolocation error', err), { enableHighAccuracy: true, maximumAge: 5000, timeout: 50000 });

    return () => { if (id) navigator.geolocation.clearWatch(id); };
  }, []);
}
