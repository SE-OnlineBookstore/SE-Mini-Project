// S3-09: My Orders page (FR-17, FR-18).
// Displays buyer's placed orders list with order number, date, status, total, and direct link to order details.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'CONFIRMED':
    case 'DELIVERED':
      return { color: '#0d7a2f', background: '#eaf5ea', border: '1px solid #7bc67b' };
    case 'SHIPPED':
    case 'PACKED':
      return { color: '#1d4ed8', background: '#eff6ff', border: '1px solid #93c5fd' };
    case 'CANCELLED':
      return { color: '#c53030', background: '#fee2e2', border: '1px solid #fca5a5' };
    case 'RETURN_REQUESTED':
    case 'RETURNED':
      return { color: '#6b21a8', background: '#f3e8ff', border: '1px solid #d8b4fe' };
    case 'PLACED':
    default:
      return { color: '#856404', background: '#fff3cd', border: '1px solid #ffeeba' };
  }
}

export default function Orders() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !user) return;
    if (user.role === 'BUYER') {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, ready]);

  if (!ready) {
    return (
      <main className="page">
        <p className="muted">Loading orders…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page narrow">
        <h1>My Orders</h1>
        <p>Please <Link to="/login">sign in</Link> as a buyer to view your order history.</p>
      </main>
    );
  }

  if (user.role !== 'BUYER') {
    return (
      <main className="page narrow">
        <h1>My Orders</h1>
        <p className="error">Order history is only available for buyer accounts.</p>
        <p><Link to="/">Return to catalogue</Link></p>
      </main>
    );
  }

  const filteredOrders = statusFilter === 'ALL'
    ? orders
    : orders.filter((o) => (o.orderStatus || '').toUpperCase() === statusFilter);

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0 }}>My Orders</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Review order progress, track deliveries, download invoices, or initiate returns.
          </p>
        </div>
        <button type="button" onClick={fetchOrders} disabled={loading} style={{ fontSize: '0.9rem' }}>
          {loading ? 'Refreshing…' : '↻ Refresh Orders'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#991b1b', marginBottom: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {orders.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label htmlFor="status-filter" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Filter by status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', padding: '6px 10px' }}
          >
            <option value="ALL">All Orders ({orders.length})</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKED">Packed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
          <h2>No orders yet</h2>
          <p className="muted">You haven&apos;t placed any book orders yet.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/">
              <button type="button">Explore Catalogue</button>
            </Link>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
          <p className="muted">No orders match status &ldquo;{statusFilter}&rdquo;.</p>
          <button type="button" className="link" onClick={() => setStatusFilter('ALL')}>
            Show all orders
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map((order) => {
            const badgeStyle = getStatusBadgeStyle(order.orderStatus);
            const dateStr = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Unknown date';

            return (
              <article
                key={order.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderBottom: '1px solid var(--line)',
                    paddingBottom: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block' }}>
                      ORDER NUMBER
                    </span>
                    <Link
                      to={`/orders/${order.id}`}
                      style={{
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textDecoration: 'underline',
                      }}
                    >
                      {order.orderNo || `Order #${order.id}`}
                    </Link>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block' }}>
                      ORDER DATE
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{dateStr}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        ...badgeStyle,
                        padding: '4px 10px',
                        borderRadius: '14px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                      }}
                    >
                      {order.orderStatus}
                    </span>

                    {order.city && (
                      <span className="muted" style={{ fontSize: '0.9rem' }}>
                        Delivery to: <strong>{order.city}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span className="muted" style={{ fontSize: '0.9rem' }}>Total:</span>
                    <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)' }}>
                      {rupees(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingTop: '8px',
                  }}
                >
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    {order.orderStatus === 'DELIVERED'
                      ? 'Item delivered · Invoice available · Return eligible within 7 days'
                      : order.orderStatus === 'CANCELLED'
                      ? 'Order cancelled'
                      : 'Live tracking & details available'}
                  </span>
                  <Link to={`/orders/${order.id}`}>
                    <button type="button" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
                      View Order &rarr;
                    </button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
