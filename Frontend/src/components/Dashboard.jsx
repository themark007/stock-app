// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useUserStore from "../store/useUserStore";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

const BASE = "http://localhost:3000/api";

export default function Dashboard() {
  const navigate = useNavigate();

  // user store
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const restoreFromStorage = useUserStore((s) => s.restoreFromStorage);

  // auth store (keeps your existing naming: isLoggedIn)
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const loginAuth = useAuthStore((s) => s.login);
  const logoutAuth = useAuthStore((s) => s.logout);

  const [stocks, setStocks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // restore user store from storage on mount
  useEffect(() => {
    restoreFromStorage();
    // no restoreAuth here because your authStore initializes token itself
  }, [restoreFromStorage]);

  // Helper: treat bogus default token (like "abcd") as absent
  const hasRealToken = token && token !== "abcd";

  // auth-aware fetch helper that includes token header and passes signal
  const authFetch = useCallback(
    (url, opts = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      };
      if (hasRealToken) headers.Authorization = `Bearer ${token}`;
      // pass signal through if provided in opts
      return fetch(url, { ...opts, headers, signal: opts.signal });
    },
    [token, hasRealToken]
  );

  // if not logged in but token exists we verify token with backend (me endpoint)
  useEffect(() => {
    // if already logged in and user present, nothing to do
    if (isLoggedIn && user?.id) return;

    // if there's a plausible token, verify it
    if (hasRealToken) {
      const controller = new AbortController();
      const { signal } = controller;

      (async () => {
        try {
          const res = await authFetch(`${BASE}/auth/getme`, { signal });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            // loginAuth expects token string (per your authStore)
            loginAuth(token);
          } else {
            // invalid token
            logoutAuth();
            setUser(null);
            navigate("/login");
          }
        } catch (err) {
          if (err.name === "AbortError") return;
          // network error or backend down
          logoutAuth();
          setUser(null);
          navigate("/login");
        }
      })();

      return () => controller.abort();
    } else {
      // no token -> go to login
      logoutAuth();
      setUser(null);
      navigate("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // only depend on token here — user and isLoggedIn handled above

  // load all stocks
  const loadStocks = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const res = await authFetch(`${BASE}/stocks`, { signal });
        // if backend returns non-json or 204 this will throw; handle gracefully
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          toast.error((data && data.error) || "Failed to load stocks");
          return;
        }
        setStocks(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        toast.error("Server unavailable (Is backend running?)");
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  // load subscriptions for current user — accepts optional signal
  const loadSubscriptions = useCallback(
    async (signal = undefined) => {
      if (!user?.id) {
        setSubs([]);
        return;
      }
      setLoading(true);
      try {
        const res = await authFetch(
          `${BASE}/users/${user.id}/subscriptions`,
          { signal }
        );
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          toast.error((data && data.error) || "Failed to load subscriptions");
          return;
        }
        setSubs(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        toast.error("Server unavailable (Is backend running?)");
      } finally {
        setLoading(false);
      }
    },
    [authFetch, user]
  );

  // when authenticated & user is ready, fetch stocks + subscriptions
  useEffect(() => {
    if (!(isLoggedIn && user?.id)) return;

    const controller = new AbortController();
    const { signal } = controller;

    loadStocks(signal);
    loadSubscriptions(signal);

    return () => controller.abort();
  }, [isLoggedIn, user, loadStocks, loadSubscriptions]);

  // subscribe
  const subscribe = async (ticker) => {
    if (!user?.id) {
      toast.error("No user found. Please login again.");
      logoutAuth();
      navigate("/login");
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch(`${BASE}/users/${user.id}/subscriptions`, {
        method: "POST",
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Subscribe failed");
      } else if (data.message === "already_subscribed") {
        toast.info(`${ticker} already subscribed`);
      } else {
        toast.success(`${ticker} subscribed`);
      }

      // refresh subscriptions (no signal needed here)
      await loadSubscriptions();
    } catch (err) {
      toast.error("Server offline?");
    } finally {
      setActionLoading(false);
    }
  };

  // unsubscribe
  const unsubscribe = async (ticker) => {
    if (!user?.id) {
      toast.error("No user found. Please login again.");
      logoutAuth();
      navigate("/login");
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch(
        `${BASE}/users/${user.id}/subscriptions/${ticker}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Unsubscribe failed");
      } else {
        toast.success(`${ticker} unsubscribed`);
      }

      // refresh subscriptions
      await loadSubscriptions();
    } catch (err) {
      toast.error("Server offline?");
    } finally {
      setActionLoading(false);
    }
  };

  const isSubscribed = (ticker) => subs.some((s) => s.ticker === ticker);

  const handleLogout = () => {
    logoutAuth();
    // optionally clear user store too
    setUser(null);
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#021124 0%, #04182a 100%)",
        padding: "28px",
        color: "#E6F6FF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Stock Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            background: "transparent",
            border: "1px solid #88caff",
            borderRadius: 10,
            color: "#88caff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <h2>All Stocks</h2>

      {loading ? (
        <div>Loading...</div>
      ) : (
        stocks.map((s) => (
          <div
            key={s.id}
            style={{
              padding: 14,
              background: "rgba(255,255,255,0.05)",
              marginBottom: 10,
              borderRadius: 10,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>{s.ticker}</strong> — ₹{s.price ?? "—"}
            </div>
            {!isSubscribed(s.ticker) ? (
              <button
                disabled={actionLoading}
                onClick={() => subscribe(s.ticker)}
                style={{
                  padding: "6px 12px",
                  background: "#00c6ff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Subscribe
              </button>
            ) : (
              <button
                disabled={actionLoading}
                onClick={() => unsubscribe(s.ticker)}
                style={{
                  padding: "6px 12px",
                  background: "#ff6b6b",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Unsubscribe
              </button>
            )}
          </div>
        ))
      )}

      <h2>Your Subscriptions</h2>
      {subs.length === 0 ? (
        <p>No subscriptions yet.</p>
      ) : (
        subs.map((s) => (
          <div
            key={s.subscription_id || s.ticker}
            style={{
              padding: 14,
              background: "rgba(255,255,255,0.05)",
              marginBottom: 10,
              borderRadius: 10,
            }}
          >
            <strong>{s.ticker}</strong> — ₹{s.price ?? "—"}
          </div>
        ))
      )}

      <ToastContainer theme="dark" autoClose={3000} />
    </div>
  );
}
