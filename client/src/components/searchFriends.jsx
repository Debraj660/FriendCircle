import React, { useState, useEffect, useRef } from "react";
import api from "../services/api"; // your axios wrapper

export default function SearchFriends() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const possibleIdKeys = ["_id", "id", "userId", "uid"];
  const possibleUsernameKeys = ["username", "user_name", "handle", "name"];

  const getIds = (obj) => {
    if (!obj || typeof obj !== "object") return [];
    return possibleIdKeys
      .map(k => obj[k])
      .filter(x => x !== undefined && x !== null)
      .map(x => String(x).trim())
      .filter(Boolean);
  };

  const getUsernames = (obj) => {
    if (!obj || typeof obj !== "object") return [];
    return possibleUsernameKeys
      .map(k => obj[k])
      .filter(x => x !== undefined && x !== null)
      .map(x => String(x).trim().toLowerCase())
      .filter(Boolean);
  };

  const userEquals = (a, b) => {
    if (!a || !b) return false;
    const aIds = getIds(a);
    const bIds = getIds(b);
    if (aIds.length && bIds.length && aIds.some(id => bIds.includes(id))) return true;

    const aNames = getUsernames(a);
    const bNames = getUsernames(b);
    if (aNames.length && bNames.length && aNames.some(n => bNames.includes(n))) return true;

    if (typeof a === "string") {
      return bIds.includes(a.trim()) || bNames.includes(a.trim().toLowerCase());
    }
    if (typeof b === "string") {
      return aIds.includes(b.trim()) || aNames.includes(b.trim().toLowerCase());
    }

    return false;
  };

  const markResultsConnected = (resultsArr, friendsArr) => {
    if (!Array.isArray(resultsArr)) return [];
    const f = Array.isArray(friendsArr) ? friendsArr : [];
    return resultsArr.map(r => {
      const connected = f.some(fr => userEquals(fr, r));
      return { ...r, connected };
    });
  };

  // normalize various response shapes to array of users
  const extractUsers = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.users)) return res.data.users;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res.data?.friends)) return res.data.friends;
    if (Array.isArray(res.data?.results)) return res.data.results;
    return [];
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t && typeof api.setToken === "function") api.setToken(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/users/me/friends");
        if (!mounted) return;
        const list = extractUsers(res);
        console.debug("Fetched friends:", list);
        setFriends(Array.isArray(list) ? list : []);
        setResults(prev => markResultsConnected(prev, Array.isArray(list) ? list : []));
      } catch (err) {
        console.error("Error fetching friends:", err?.response?.data ?? err.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Debounced search
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
        const res = await api.get("/users/search", { params: { q: term } });
        const users = extractUsers(res);
        const usersWithConnected = markResultsConnected(Array.isArray(users) ? users : [], friends);
        console.debug("Search users:", usersWithConnected);
        setResults(usersWithConnected);
      } catch (err) {
        console.error("Search error:", err?.response?.data ?? err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, friends]); 

  const handleAddFriend = async (idOrUsername) => {
    const sid = String(idOrUsername ?? "").trim();
    if (!sid) return;

    const prevFriends = Array.isArray(friends) ? friends.slice() : [];
    const prevResults = Array.isArray(results) ? results.slice() : [];

    // try to resolve full user from results by id or username
    const found = prevResults.find(r => userEquals(r, sid) || userEquals(r, { id: sid } ) || userEquals(r, { username: sid }));
    const minimal = found ? { ...found } : { _id: sid, username: sid };
    const optimistic = { ...minimal, connected: true };

    setFriends(prev => {
      const list = Array.isArray(prev) ? prev.slice() : [];
      if (!list.some(f => userEquals(f, optimistic))) list.push(optimistic);
      else {
        // ensure connected flag true
        return list.map(f => userEquals(f, optimistic) ? { ...f, ...optimistic } : f);
      }
      return list;
    });

    setResults(prev => markResultsConnected(prev, [ ...(Array.isArray(prev) ? prev : []), optimistic ].concat(prevFriends)));

    try {
      const res = await api.post(`/users/${sid}/add-friend`);
      const serverUser = res?.data?.user ?? res?.data ?? null;
      if (serverUser) {
        // merge server data into friends & results
        setFriends(prev => {
          const list = Array.isArray(prev) ? prev.slice() : [];
          const idx = list.findIndex(f => userEquals(f, serverUser));
          if (idx !== -1) list[idx] = { ...list[idx], ...serverUser, connected: true };
          else list.push({ ...serverUser, connected: true });
          return list;
        });
        setResults(prev => prev.map(r => userEquals(r, serverUser) ? { ...r, ...serverUser, connected: true } : r));
      } else {

      }
    } catch (err) {
      console.error("Error adding friend:", err?.response?.data ?? err.message);
      setFriends(prevFriends);
      setResults(prevResults);
      alert(err?.response?.data?.message || "Failed to add friend");
    }
  };

  const isFriend = (idOrUser) => {
    if (!idOrUser) return false;
    return friends.some(f => userEquals(f, idOrUser));
  };

  const isConnected = (idOrUser) => {
    if (!idOrUser) return false;
    const f = friends.find(fr => userEquals(fr, idOrUser));
    return Boolean(f && f.connected);
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

      {results.map((user, idx) => {
        const ids = getIds(user);
        const key = ids[0] || getUsernames(user)[0] || `user-${idx}`;

        return (
          <div key={key} className="flex justify-between items-center border-t py-2">
            <div>
              <p className="font-medium">{user.name || user.username}</p>
              <p className="text-sm text-gray-500">{user.username || user.name}</p>
            </div>

            { isConnected(user) ? (
                <button disabled className="bg-green-500 text-white px-3 py-1 rounded-lg cursor-default">Connected</button>
              ) : isFriend(user) ? (
                <button disabled className="bg-green-400 text-white cursor-not-allowed px-3 py-1 rounded-lg">Already Connected</button>
              ) : (
                <button
                  onClick={() => {
                    const primaryId = getIds(user)[0] || getUsernames(user)[0];
                    handleAddFriend(primaryId);
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                >
                  + Add Friend
                </button>
              )
            }
          </div>
        );
      })}
    </div>
  );
}
