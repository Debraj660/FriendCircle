import React, { useState, useEffect, useRef } from "react";
import api from "../services/api"; // your axios instance

export default function SearchFriends() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);

  // Ensure API has token from localStorage (or you can pass token prop and set it)
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) api.setToken(t);
  }, []);

  // Fetch my friends when component loads
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await api.get("/users/me/friends");
        // handle various possible shapes
        let list = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.data?.users)) list = res.data.users;
        else if (Array.isArray(res.data?.data)) list = res.data.data;
        else list = res.data || [];

        setFriends(list || []);
      } catch (err) {
        console.error("Error fetching friends:", err?.response?.status, err?.response?.data || err.message);
      }
    };
    fetchFriends();
  }, []);

  // helper to normalize response payload to array
  const extractUsers = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.users)) return res.data.users;
    if (Array.isArray(res.data?.data)) return res.data.data;
    // fallback: maybe res.data is an object with items
    return [];
  };

  // Search users (debounced) — keeps UI same
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = q?.trim();
    if (!term || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // use axios params so server receives q properly and headers are preserved
        const res = await api.get("/users/search", { params: { q: term } });
        console.log("search response raw:", res); // debug: inspect in DevTools
        const users = extractUsers(res);
        setResults(users);
      } catch (err) {
        console.error("Search error:", err?.response?.status, err?.response?.data || err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Add friend and update local friends immediately
  const handleAddFriend = async (id) => {
    try {
      await api.post(`/users/${id}/add-friend`);
      // find added user in current results (try both _id and id)
      const added = results.find(u => String(u._id || u.id) === String(id)) || { _id: id };
      setFriends(prev => {
        // avoid duplicates
        const exists = prev.some(f => String(f._id || f.id) === String(id));
        return exists ? prev : [...prev, added];
      });
    } catch (err) {
      console.error("Error adding friend:", err?.response?.status, err?.response?.data || err.message);
      alert(err?.response?.data?.message || 'Failed to add friend');
    }
  };

  // helper to check if already friend — support _id or id or username fallback
  const isFriend = (idOrUser) => {
    if (!idOrUser) return false;
    // if object passed
    if (typeof idOrUser === 'object') {
      const id = String(idOrUser._id || idOrUser.id || '');
      if (id && friends.some(f => String(f._id || f.id) === id)) return true;
      if (idOrUser.username && friends.some(f => String(f.username).toLowerCase() === String(idOrUser.username).toLowerCase())) return true;
      return false;
    }
    // if id string passed
    const sid = String(idOrUser);
    return friends.some(f => String(f._id || f.id) === sid)
      || friends.some(f => String(f.username).toLowerCase() === sid.toLowerCase());
  };

  return (
    <div className="p-4 rounded-xl bg-white shadow-lg w-[400px] mx-auto">
      <h2 className="text-lg font-semibold mb-2">Search & Add Friends</h2>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by username or name..."
        className="w-full border px-3 py-2 rounded-lg mb-3"
      />
      {loading && <p>Loading...</p>}
      {!loading && results.length === 0 && q && <p>No users found.</p>}
      {results.map((user) => {
        const uid = String(user._id || user.id || '');
        return (
          <div key={uid || user.username} className="flex justify-between items-center border-t py-2">
            <div>
              <p className="font-medium">{user.name || user.username}</p>
              <p className="text-sm text-gray-500">{user.username}</p>
            </div>

            {isFriend(user) ? (
              <button disabled className="bg-gray-300 text-gray-600 cursor-not-allowed px-3 py-1 rounded-lg">
                Connected
              </button>
            ) : (
              <button
                onClick={() => handleAddFriend(uid || user.username)}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
              >
                + Add Friend
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
