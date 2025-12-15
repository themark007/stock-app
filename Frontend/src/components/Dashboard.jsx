// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useUserStore from "../store/useUserStore";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

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
  const socketRef = useRef(null);
  const [priceChanges, setPriceChanges] = useState({}); // track price direction
  const [priceHistory, setPriceHistory] = useState({}); // store price history for charts
  const [selectedStock, setSelectedStock] = useState(null); // for detailed view

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
        
        // Initialize chart data for newly subscribed stock
        const currentStock = stocks.find(s => s.ticker === ticker);
        if (currentStock?.price) {
          updatePriceHistory(ticker, currentStock.price);
        }
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
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    logoutAuth();
    setUser(null);
    navigate("/login", { replace: true });
  };

  // Update price history for charts
  const updatePriceHistory = (ticker, price) => {
    setPriceHistory(prev => {
      const history = prev[ticker] || [];
      const now = new Date();
      const newPoint = {
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: parseFloat(price),
        timestamp: now.getTime()
      };
      
      // Keep last 30 data points for better visualization
      const updated = [...history, newPoint].slice(-30);
      return { ...prev, [ticker]: updated };
    });
  };

  // WebSocket: Real-time price updates
  useEffect(() => {
    if (!(isLoggedIn && user?.id) || subs.length === 0) return;

    // Connect to socket.io
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      
      // Join rooms for subscribed stocks
      const tickers = subs.map(s => s.ticker);
      socket.emit('join-stocks', { tickers });
    });

    socket.on('joined', (data) => {
      console.log('✅ Joined stock rooms:', data.tickers);
    });

    socket.on('stock:update', (data) => {
      console.log('Price update:', data);
      
      // Update stock price in real-time
      setStocks(prevStocks => 
        prevStocks.map(stock => 
          stock.ticker === data.ticker 
            ? { 
                ...stock, 
                price: data.price,
                updated_at: data.updated_at 
              }
            : stock
        )
      );

      // Update subscription price
      setSubs(prevSubs =>
        prevSubs.map(sub =>
          sub.ticker === data.ticker
            ? { ...sub, price: data.price, updated_at: data.updated_at }
            : sub
        )
      );

      // Update price history for chart
      updatePriceHistory(data.ticker, data.price);

      // Track price change direction for animation
      setPriceChanges(prev => {
        const oldPrice = prev[data.ticker]?.price;
        const direction = oldPrice !== undefined
          ? (data.price > oldPrice ? 'up' : data.price < oldPrice ? 'down' : 'same')
          : 'same';
        
        return {
          ...prev,
          [data.ticker]: { price: data.price, direction }
        };
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoggedIn, user, subs]);

  const getPriceColor = (ticker) => {
    const change = priceChanges[ticker];
    if (!change) return '#60A5FA';
    if (change.direction === 'up') return '#10B981';
    if (change.direction === 'down') return '#EF4444';
    return '#60A5FA';
  };

  const getPriceChangeIcon = (ticker) => {
    const change = priceChanges[ticker];
    if (!change) return '—';
    if (change.direction === 'up') return '▲';
    if (change.direction === 'down') return '▼';
    return '—';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Stock Broker Dashboard</h1>
          <p style={styles.subtitle}>Welcome back, {user?.username || user?.email?.split('@')[0] || 'User'}</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      {/* My Portfolio Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          My Portfolio
          <span style={styles.badge}>{subs.length} Active</span>
        </h2>
        
        {subs.length === 0 ? (
          <div style={styles.emptyState}>
            <svg style={styles.emptyIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p style={styles.emptyText}>No subscriptions yet</p>
            <p style={styles.emptySubtext}>Subscribe to stocks below to start tracking prices</p>
          </div>
        ) : (
          <div style={styles.portfolioGrid}>
            {subs.map((s) => (
              <div 
                key={s.subscription_id || s.ticker} 
                style={styles.portfolioCard}
                onClick={() => setSelectedStock(s.ticker)}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.ticker}>{s.ticker}</div>
                    <div style={styles.stockLabel}>Real-time</div>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      unsubscribe(s.ticker);
                    }}
                    style={styles.unsubBtn}
                    title="Unsubscribe"
                  >
                    ×
                  </button>
                </div>
                
                <div style={styles.priceSection}>
                  <div style={{
                    ...styles.price,
                    color: getPriceColor(s.ticker)
                  }}>
                    ${s.price?.toFixed(2) ?? "—"}
                  </div>
                  <div style={{
                    ...styles.priceChange,
                    color: getPriceColor(s.ticker)
                  }}>
                    {getPriceChangeIcon(s.ticker)} {priceChanges[s.ticker]?.direction === 'up' ? 'Rising' : priceChanges[s.ticker]?.direction === 'down' ? 'Falling' : 'Stable'}
                  </div>
                </div>

                {/* Mini Chart */}
                {priceHistory[s.ticker] && priceHistory[s.ticker].length > 1 && (
                  <div style={styles.miniChart}>
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart data={priceHistory[s.ticker]}>
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke={getPriceColor(s.ticker)}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Chart Modal */}
      {selectedStock && priceHistory[selectedStock] && priceHistory[selectedStock].length > 1 && (
        <div style={styles.modal} onClick={() => setSelectedStock(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{selectedStock} Price Chart</h3>
                <p style={styles.modalSubtitle}>Live price movement</p>
              </div>
              <button onClick={() => setSelectedStock(null)} style={styles.closeBtn}>×</button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceHistory[selectedStock]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #1F2937',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Available Stocks Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Available Stocks
          <span style={styles.badge}>{stocks.length} Total</span>
        </h2>
        
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading stocks...</p>
          </div>
        ) : (
          <div style={styles.stocksGrid}>
            {stocks.map((s) => (
              <div key={s.id} style={styles.stockCard}>
                <div style={styles.stockInfo}>
                  <div style={styles.stockLeft}>
                    <div style={styles.stockTicker}>{s.ticker}</div>
                    <div style={{
                      ...styles.stockPrice,
                      color: getPriceColor(s.ticker)
                    }}>
                      ${s.price?.toFixed(2) ?? "—"}
                    </div>
                    <div style={{
                      ...styles.stockChange,
                      color: getPriceColor(s.ticker)
                    }}>
                      {getPriceChangeIcon(s.ticker)}
                    </div>
                  </div>
                  {!isSubscribed(s.ticker) ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => subscribe(s.ticker)}
                      style={styles.subscribeBtn}
                    >
                      Subscribe
                    </button>
                  ) : (
                    <div style={styles.subscribedBadge}>Subscribed</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer theme="dark" autoClose={2000} position="bottom-right" />
    </div>
  );
}

// Professional Black & Blue Styles
const styles = {
  container: {
    minHeight: "100vh",
    background: "#000000",
    padding: "32px 48px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#FFFFFF",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    padding: "24px 32px",
    background: "#0A0A0A",
    border: "1px solid #1F2937",
    borderRadius: "12px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#6B7280",
    fontWeight: "400",
  },
  logoutBtn: {
    padding: "8px 16px",
    background: "#1F2937",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#9CA3AF",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: "20px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: "600",
  },
  badge: {
    background: "#1E3A8A",
    padding: "4px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#93C5FD",
  },
  portfolioGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
  },
  portfolioCard: {
    background: "#0A0A0A",
    border: "1px solid #1F2937",
    borderRadius: "12px",
    padding: "24px",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  ticker: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: "-0.5px",
  },
  stockLabel: {
    fontSize: "11px",
    color: "#6B7280",
    marginTop: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  unsubBtn: {
    background: "transparent",
    border: "1px solid #374151",
    color: "#9CA3AF",
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    lineHeight: "1",
  },
  priceSection: {
    marginBottom: "16px",
  },
  price: {
    fontSize: "36px",
    fontWeight: "700",
    marginBottom: "4px",
    letterSpacing: "-1px",
  },
  priceChange: {
    fontSize: "13px",
    fontWeight: "500",
  },
  miniChart: {
    marginTop: "16px",
    opacity: 0.9,
    cursor: "pointer",
    padding: "8px 0",
  },
  stocksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  stockCard: {
    background: "#0A0A0A",
    border: "1px solid #1F2937",
    borderRadius: "12px",
    padding: "20px",
    transition: "all 0.2s ease",
  },
  stockInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  stockTicker: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: "-0.3px",
  },
  stockPrice: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.8px",
  },
  stockChange: {
    fontSize: "16px",
    fontWeight: "500",
  },
  subscribeBtn: {
    padding: "10px 20px",
    background: "#1E40AF",
    border: "none",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },
  subscribedBadge: {
    padding: "10px 20px",
    background: "#064E3B",
    color: "#10B981",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    border: "1px solid #065F46",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#0A0A0A",
    borderRadius: "12px",
    border: "1px dashed #374151",
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    margin: "0 auto 20px",
    color: "#6B7280",
  },
  emptyText: {
    fontSize: "18px",
    color: "#FFFFFF",
    margin: "0 0 8px 0",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: "14px",
    color: "#6B7280",
    margin: 0,
  },
  loading: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#9CA3AF",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #1F2937",
    borderTop: "3px solid #3B82F6",
    borderRadius: "50%",
    margin: "0 auto 16px",
    animation: "spin 1s linear infinite",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    background: "#0A0A0A",
    border: "1px solid #1F2937",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "800px",
    width: "100%",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    color: "#6B7280",
  },
  closeBtn: {
    background: "transparent",
    border: "1px solid #374151",
    color: "#9CA3AF",
    width: "36px",
    height: "36px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    lineHeight: "1",
  },
};
