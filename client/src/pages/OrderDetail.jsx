// Order Detail & Confirmation page.
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user, ready } = useAuth();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const justPlaced = location.state?.justPlaced;

  useEffect(() => {
    if (!ready || !user) return;
    setLoading(true);
    api.get(`/orders/${id}`)
      .then((res) => {
        setOrderData(res.data);
        setError(null);
      })
      .catch((err) => setError(readError(err).message))
      .finally(() => setLoading(false));
  }, [id, user, ready]);

  if (!ready) return <main className="page"><p className="muted">Loading…</p></main>;

  if (!user) {
    return (
      <main className="page">
        <h1>Order Details</h1>
        <p>Please <Link to="/login">sign in</Link> to view this order.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="error" role="alert">{error}</div>
        <p><Link to="/">&larr; Return to Home</Link></p>
      </main>
    );
  }

  if (loading || !orderData) {
    return <main className="page"><p className="muted">Loading order details…</p></main>;
  }

  const { order, items } = orderData;
  const addr = order.address || {};

  return (
    <main className="page">
      {justPlaced && (
        <div style={{ padding: '16px', marginBottom: '24px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '8px' }} role="status">
          <h2 style={{ color: '#0d7a2f', marginTop: 0, fontSize: '1.4rem' }}>🎉 Thank you! Your order has been placed.</h2>
          <p style={{ margin: 0 }}>
            We have received your order <strong>{order.orderNo}</strong>. We will notify you once your books are packed and dispatched.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Order {order.orderNo}</h1>
          <p className="muted" style={{ margin: 0 }}>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span className="chip" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
            Status: {order.orderStatus}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginTop: '24px' }}>
        <div>
          <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>Items Ordered ({items.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <strong>{it.title}</strong>
                      {it.book?.author && <div className="muted" style={{ fontSize: '0.85rem' }}>{it.book.author}</div>}
                    </td>
                    <td>{it.quantity}</td>
                    <td>{rupees(it.unitPrice)}</td>
                    <td style={{ fontWeight: 'bold' }}>{rupees(it.unitPrice * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>Delivery Address</h2>
            <div><strong>{addr.line1}</strong></div>
            {addr.line2 && <div>{addr.line2}</div>}
            <div className="muted">{addr.city}, {addr.state} - {addr.pincode}</div>
          </section>
        </div>

        <aside style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', background: '#fafafa', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>Payment Breakdown</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Items Total:</span>
            <span>{rupees(order.itemTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Shipping:</span>
            <span>{order.shippingFee === 0 ? 'FREE' : rupees(order.shippingFee)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#0d7a2f' }}>
              <span>Coupon Discount:</span>
              <span>-{rupees(order.discount)}</span>
            </div>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <span>Total Amount:</span>
            <span>{rupees(order.totalAmount)}</span>
          </div>
          <div style={{ marginTop: '20px' }}>
            <Link to="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              &larr; Back to Catalogue
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
