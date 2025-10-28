import React, { useEffect, useState, useCallback, useRef } from 'react';
import LiveMap from '../components/LiveMap';
import api from '../services/api';
import { initSocket, emitLocation, subscribeToLocation } from '../services/socket';
import useGeolocation from '../hooks/useGeolocation';
import SearchFriends from '../components/searchFriends';

// Temporary LiveMap placeholder - remove when using real import
// const LiveMap = ({ locations, myId }) => (
//   <div className="w-full h-full bg-slate-100 flex items-center justify-center">
//     <div className="text-center p-6">
//       <p className="text-slate-600 mb-2">Leaflet Map Component</p>
//       <p className="text-sm text-slate-500">Import your LiveMap component to see the actual map</p>
//       <p className="text-xs text-slate-400 mt-2">Tracking {Object.keys(locations).length} location(s)</p>
//     </div>
//   </div>
// );

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (e) {
    return null;
  }
}

export default function MapPage(props) {
  const [token, setToken] = useState(() => props?.token || localStorage.getItem('token') || null);
  const [friends, setFriends] = useState([]);
  const [locations, setLocations] = useState({});
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const profileMenuRef = useRef(null);
  const searchModalRef = useRef(null);

  const myId = (() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload && payload.sub) return payload.sub;
    }
    return null;
  })();

  const decoded = token ? decodeJwtPayload(token) : null;
  const displayUsername = decoded?.username || decoded?.name || localStorage.getItem('username') || 'You';
  const displayEmail = decoded?.email || null;

  const upsertLocation = (loc) => {
    if (!loc || !loc.userId) return;
    setLocations((prev) => ({ ...prev, [loc.userId]: loc }));
  };

  const refreshFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const response = await fetch('/api/users/me/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }
      
      const data = await response.json();
      setFriends(data || []);
    } catch (err) {
      console.error('refreshFriends error', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [token]);

  const refreshFriendLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const response = await fetch('/api/users/me/friends/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      const map = {};
      (data || []).forEach((l) => {
        const uid = l.user?._id || l.user?.id || (l.user && String(l.user));
        if (!uid) return;
        map[uid] = {
          userId: uid,
          username: l.user?.username,
          name: l.user?.name,
          lat: l.lat,
          lng: l.lng,
          accuracy: l.accuracy,
          ts: new Date(l.ts).getTime(),
        };
      });
      setLocations((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error('refreshFriendLocations error', err);
    } finally {
      setLoadingLocations(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    refreshFriends();
    refreshFriendLocations();

    // Initialize socket and subscribe to location updates
    // Uncomment when socket service is available:
    initSocket(token);
    subscribeToLocation((payload) => {
      console.log('socket location_update', payload);
      if (!payload || !payload.userId) return;
      upsertLocation(payload);
    });
  }, [token, refreshFriends, refreshFriendLocations]);

  // Geolocation hook - uncomment when useGeolocation is available:
  useGeolocation((pos) => {
    if (!pos || !pos.coords) return;
    const data = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      ts: Date.now(),
    };
    console.log('geolocation update ->', data);
    emitLocation(data);
  
    const idKey = myId || 'me';
    const myLocPayload = {
      userId: idKey,
      username: 'You',
      name: 'You',
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      ts: data.ts,
    };
    upsertLocation(myLocPayload);
  });

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close search modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchModalRef.current && !searchModalRef.current.contains(event.target)) {
        setShowSearchModal(false);
      }
    }
    if (showSearchModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchModal]);

  async function handleFriendAdded() {
    await refreshFriends();
    await refreshFriendLocations();
  }

  function handleLogoutClick() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setToken(null);
    if (typeof props?.onLogout === 'function') {
      props.onLogout();
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-lg text-slate-700 mb-4">You are not signed in</p>
          <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with higher z-index */}
      <header className="relative z-50 flex h-20 justify-between items-center border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-6 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FriendCircle
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-slate-600 text-sm font-medium">
              {loadingFriends ? 'Loading...' : `${friends.length} Friends`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add Friends Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-3 py-2 sm:px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 group"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline font-medium">Add Friends</span>
          </button>

          {/* Profile Menu */}
          <div className="relative z-50" ref={profileMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ring-2 ring-white"
              aria-label="Profile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl ring-1 ring-slate-200 z-[100] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50">
                  <p className="font-semibold text-slate-800">{displayUsername}</p>
                  {displayEmail && <p className="text-xs text-slate-500 truncate mt-0.5">{displayEmail}</p>}
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      // future: navigate to profile/settings
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profile / Settings
                  </button>

                  <button
                    onClick={handleLogoutClick}
                    className="w-full text-left px-3 py-2 rounded hover:bg-red-50 transition-colors text-red-600 font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Friends Counter */}
      <div className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border-b border-slate-200 z-40">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <p className="text-slate-600 text-sm font-medium">
          {loadingFriends ? 'Loading friends...' : `${friends.length} Friends Connected`}
        </p>
      </div>

      {/* Search Friends Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-start justify-center pt-20 px-4">
          <div 
            ref={searchModalRef}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Search & Add Friends
              </h2>
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <SearchFriends 
                onFriendAdded={() => {
                  handleFriendAdded();
                  setShowSearchModal(false);
                }} 
                currentFriends={friends} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Map container with lower z-index */}
      <main className="flex-1 flex min-h-0 relative z-0">
        <div className="flex-1 relative">
          <LiveMap locations={locations} myId={myId} />
        </div>
      </main>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}