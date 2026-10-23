// Order Detail & Confirmation page with Sandbox Payment (FR-16).
import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user, ready } = useAuth();

  const [orderData, setOrderData] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sandbox payment state
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  const justPlaced = location.state?.justPlaced;

  const fetchPaymentInfo = useCallback(() => {
    api.get(`/payments/order/${id}`)
      .then((res) => setPaymentInfo(res.data))
      .catch(() => {});
  }, [id]);

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

    fetchPaymentInfo();
  }, [id, user, ready, fetchPaymentInfo]);

  const handleSimulatePayment = async (status = 'SUCCESS') => {
    setPaying(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const res = await api.post('/payments/simulate', {
        orderId: id,
        status,
        method: selectedMethod,
      });

      if (res.data.orderStatus === 'CONFIRMED') {
        setOrderData((prev) => ({
          ...prev,
          order: { ...prev.order, orderStatus: 'CONFIRMED' },
        }));
        setPaySuccess(`Payment confirmed via Sandbox (${selectedMethod})! Transaction Ref: ${res.data.txnRef}`);
      } else {
        setPayError(`Payment attempt marked as ${res.data.paymentStatus}. Order remains in PLACED state.`);
      }
      fetchPaymentInfo();
    } catch (err) {
      setPayError(readError(err).message);
    } finally {
      setPaying(false);
    }
  };

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
  const isPlaced = order.orderStatus === 'PLACED';
  const isConfirmed = order.orderStatus === 'CONFIRMED';
  const attemptsCount = paymentInfo?.attemptsCount ?? 0;
  const maxAttempts = paymentInfo?.maxAttempts ?? 3;
  const canPay = isPlaced && attemptsCount < maxAttempts;

  return (
    <main className="page">
      {justPlaced && (
        <div style={{ padding: '16px', marginBottom: '24px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '8px' }} role="status">
          <h2 style={{ color: '#0d7a2f', marginTop: 0, fontSize: '1.4rem' }}>🎉 Thank you! Your order has been placed.</h2>
          <p style={{ margin: 0 }}>
            We have received your order <strong>{order.orderNo}</strong>. Complete online payment below to confirm your order immediately.
          </p>
        </div>
      )}

      {paySuccess && (
        <div style={{ padding: '16px', marginBottom: '24px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '8px' }} role="status">
          <h3 style={{ color: '#0d7a2f', marginTop: 0, fontSize: '1.2rem' }}>🎉 Payment Successful!</h3>
          <p style={{ margin: 0 }}>{paySuccess}</p>
        </div>
      )}

      {payError && (
        <div className="error" style={{ padding: '16px', marginBottom: '24px' }} role="alert">
          <strong>Payment Error:</strong> {payError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Order {order.orderNo}</h1>
          <p className="muted" style={{ margin: 0 }}>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span
            className="chip"
            style={{
              fontSize: '0.95rem',
              fontWeight: 'bold',
              background: isConfirmed ? '#eaf5ea' : '#fff3cd',
              color: isConfirmed ? '#0d7a2f' : '#856404',
              border: isConfirmed ? '1px solid #7bc67b' : '1px solid #ffeeba',
            }}
          >
            Status: {order.orderStatus}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginTop: '24px' }}>
        <div>
          {/* Items Section */}
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

          {/* Delivery Address */}
          <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>Delivery Address</h2>
            <div><strong>{addr.line1}</strong></div>
            {addr.line2 && <div>{addr.line2}</div>}
            <div className="muted">{addr.city}, {addr.state} - {addr.pincode}</div>
          </section>

          {/* Sandbox Payment Box (FR-16) */}
          {isPlaced && (
            <section style={{ border: '2px solid var(--accent, #0066cc)', borderRadius: '8px', padding: '20px', background: '#f8fbff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>💳 Online Payment (Sandbox)</h2>
                <span className="chip" style={{ background: '#e0f0ff', color: '#0066cc', fontWeight: 'bold' }}>
                  Attempt {attemptsCount} of {maxAttempts}
                </span>
              </div>

              <p className="muted" style={{ fontSize: '0.9rem', marginTop: 0, marginBottom: '16px' }}>
                Simulate an online payment with HMAC-SHA256 verified webhook (FR-16). No real money is used.
              </p>

              {attemptsCount >= maxAttempts ? (
                <div className="error" style={{ padding: '12px', borderRadius: '6px' }}>
                  Maximum allowed payment attempts ({maxAttempts}) exceeded for this order (FR-16). Please place a new order.
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.9rem' }}>
                      Select Payment Method:
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['UPI', 'CARD', 'NETBANKING'].map((method) => (
                        <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={selectedMethod === method}
                            onChange={(e) => setSelectedMethod(e.target.value)}
                            style={{ width: 'auto' }}
                          />
                          <span>{method === 'CARD' ? 'Credit / Debit Card' : method === 'NETBANKING' ? 'Net Banking' : 'UPI (GPay / PhonePe)'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleSimulatePayment('SUCCESS')}
                      disabled={paying || !canPay}
                      style={{ padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', background: '#0d7a2f', borderColor: '#0d7a2f' }}
                    >
                      {paying ? 'Processing…' : `Pay ${rupees(order.totalAmount)} (Simulate Success)`}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulatePayment('FAILED')}
                      disabled={paying || !canPay}
                      className="secondary"
                      style={{ padding: '10px 16px', fontSize: '0.95rem' }}
                    >
                      {paying ? 'Processing…' : 'Simulate Payment Failure'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isConfirmed && (
            <section style={{ border: '1px solid #7bc67b', borderRadius: '8px', padding: '16px', background: '#f4fbf4' }}>
              <h3 style={{ color: '#0d7a2f', margin: '0 0 8px 0' }}>✅ Payment Confirmed</h3>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Your payment for order <strong>{order.orderNo}</strong> has been signature-verified and confirmed. Stock has been reserved.
              </p>
            </section>
          )}
        </div>

        {/* Sidebar Breakdown */}
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
