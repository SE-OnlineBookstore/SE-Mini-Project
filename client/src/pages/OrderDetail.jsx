// Order Detail & Confirmation page with Sandbox Payment (FR-16), PDF Invoice (FR-17) and Order Tracking & Cancellation (FR-18).
import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

const LIFECYCLE_STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user, ready } = useAuth();

  const [orderData, setOrderData] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sandbox payment state (FR-16)
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  // Invoice download state (FR-17)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  // Order lifecycle & cancellation state (FR-18)
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState(null);
  const [returnSuccess, setReturnSuccess] = useState(null);

  const justPlaced = location.state?.justPlaced;

  const fetchPaymentInfo = useCallback(() => {
    api.get(`/payments/order/${id}`)
      .then((res) => setPaymentInfo(res.data))
      .catch(() => {});
  }, [id]);

  const fetchTrackingInfo = useCallback(() => {
    api.get(`/orders/${id}/tracking`)
      .then((res) => setTrackingInfo(res.data))
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
    fetchTrackingInfo();
  }, [id, user, ready, fetchPaymentInfo, fetchTrackingInfo]);

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
          order: {
            ...prev.order,
            orderStatus: 'CONFIRMED',
            statusHistory: [...(prev.order.statusHistory || []), { status: 'CONFIRMED', at: new Date().toISOString() }],
          },
        }));
        setPaySuccess(`Payment confirmed via Sandbox (${selectedMethod})! Transaction Ref: ${res.data.txnRef}`);
      } else {
        setPayError(`Payment attempt marked as ${res.data.paymentStatus}. Order remains in PLACED state.`);
      }
      fetchPaymentInfo();
      fetchTrackingInfo();
    } catch (err) {
      setPayError(readError(err).message);
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    setInvoiceError(null);
    try {
      const response = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${orderData.order.orderNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setInvoiceError(readError(err).message || 'Failed to download invoice PDF.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Any reserved stock will be restored to inventory.')) {
      return;
    }
    setCancelling(true);
    setCancelError(null);
    setCancelSuccess(null);
    try {
      const res = await api.post(`/orders/${id}/cancel`, {
        reason: cancelReason || 'Buyer requested cancellation',
      });
      setOrderData((prev) => ({
        ...prev,
        order: {
          ...prev.order,
          orderStatus: 'CANCELLED',
          statusHistory: [...(prev.order.statusHistory || []), { status: 'CANCELLED', at: new Date().toISOString() }],
        },
      }));
      setCancelSuccess(res.data.message || 'Order has been successfully cancelled.');
      fetchTrackingInfo();
    } catch (err) {
      setCancelError(readError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  const handleReturnOrder = async () => {
    if (!window.confirm('Are you sure you want to request a return for this delivered order?')) {
      return;
    }
    setReturning(true);
    setReturnError(null);
    setReturnSuccess(null);
    try {
      const res = await api.post(`/orders/${id}/return`, {
        reason: returnReason || 'Buyer requested return',
      });
      setOrderData((prev) => ({
        ...prev,
        order: {
          ...prev.order,
          orderStatus: 'RETURNED',
          statusHistory: [...(prev.order.statusHistory || []), { status: 'RETURNED', at: new Date().toISOString() }],
        },
      }));
      setReturnSuccess(res.data.message || 'Return request submitted successfully.');
      fetchTrackingInfo();
    } catch (err) {
      setReturnError(readError(err).message);
    } finally {
      setReturning(false);
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
  const currentStatus = order.orderStatus;
  const isPlaced = currentStatus === 'PLACED';
  const isConfirmed = currentStatus === 'CONFIRMED';
  const isCancelled = currentStatus === 'CANCELLED';
  const isReturned = currentStatus === 'RETURNED';
  const isShipped = currentStatus === 'SHIPPED';
  const isDelivered = currentStatus === 'DELIVERED';
  const attemptsCount = paymentInfo?.attemptsCount ?? 0;
  const maxAttempts = paymentInfo?.maxAttempts ?? 3;
  const canPay = isPlaced && attemptsCount < maxAttempts;

  // Tracking details
  const statusHistory = trackingInfo?.statusHistory || order.statusHistory || [];
  const shipments = trackingInfo?.shipments || [];
  const isCancellable = trackingInfo ? trackingInfo.isCancellable : ['PLACED', 'CONFIRMED', 'PACKED'].includes(currentStatus);
  const isReturnable = trackingInfo ? trackingInfo.isReturnable : isDelivered;

  const getStatusTimestamp = (status) => {
    const entry = statusHistory.find((h) => h.status === status);
    if (!entry) return null;
    return new Date(entry.at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
        return '#0d7a2f';
      case 'CANCELLED':
        return '#c53030';
      case 'RETURNED':
        return '#6b21a8';
      case 'SHIPPED':
      case 'PACKED':
        return '#1d4ed8';
      default:
        return '#856404';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
        return '#eaf5ea';
      case 'CANCELLED':
        return '#fee2e2';
      case 'RETURNED':
        return '#f3e8ff';
      case 'SHIPPED':
      case 'PACKED':
        return '#eff6ff';
      default:
        return '#fff3cd';
    }
  };

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

      {cancelSuccess && (
        <div style={{ padding: '16px', marginBottom: '24px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '8px' }} role="status">
          <h3 style={{ color: '#0d7a2f', marginTop: 0, fontSize: '1.2rem' }}>Order Cancelled</h3>
          <p style={{ margin: 0 }}>{cancelSuccess}</p>
        </div>
      )}

      {cancelError && (
        <div className="error" style={{ padding: '16px', marginBottom: '24px' }} role="alert">
          <strong>Cancellation Error:</strong> {cancelError}
        </div>
      )}

      {returnSuccess && (
        <div style={{ padding: '16px', marginBottom: '24px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '8px' }} role="status">
          <h3 style={{ color: '#0d7a2f', marginTop: 0, fontSize: '1.2rem' }}>Return Requested</h3>
          <p style={{ margin: 0 }}>{returnSuccess}</p>
        </div>
      )}

      {returnError && (
        <div className="error" style={{ padding: '16px', marginBottom: '24px' }} role="alert">
          <strong>Return Error:</strong> {returnError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Order {order.orderNo}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isConfirmed && (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              style={{
                padding: '6px 14px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                background: '#1d4ed8',
                borderColor: '#1d4ed8',
                color: '#ffffff',
                cursor: 'pointer',
                borderRadius: '6px',
              }}
            >
              {downloadingInvoice ? 'Downloading…' : '📄 Download Invoice (PDF)'}
            </button>
          )}
          <span
            className="chip"
            style={{
              fontSize: '0.95rem',
              fontWeight: 'bold',
              background: getStatusBg(currentStatus),
              color: getStatusColor(currentStatus),
              border: `1px solid ${getStatusColor(currentStatus)}`,
            }}
          >
            Status: {currentStatus}
          </span>
        </div>
      </div>

      {/* FR-18 Order Lifecycle Tracking Stepper */}
      <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '20px', marginTop: '20px', background: '#ffffff' }}>
        <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '16px' }}>📍 Order Tracking & Lifecycle</h2>

        {isCancelled ? (
          <div style={{ padding: '14px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#991b1b', marginBottom: '16px' }}>
            <strong>🚫 This order was cancelled on {getStatusTimestamp('CANCELLED') || 'recently'}.</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>All reserved book stock has been restored to seller inventory.</p>
          </div>
        ) : isReturned ? (
          <div style={{ padding: '14px', background: '#f3e8ff', border: '1px solid #a855f7', borderRadius: '6px', color: '#6b21a8', marginBottom: '16px' }}>
            <strong>🔄 Return request received on {getStatusTimestamp('RETURNED') || 'recently'}.</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Your return request has been recorded within the 7-day window. Our team will verify and complete the return.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', margin: '20px 0', overflowX: 'auto', paddingBottom: '8px' }}>
            {LIFECYCLE_STEPS.map((step, idx) => {
              const reachedIdx = LIFECYCLE_STEPS.indexOf(currentStatus);
              const isPastOrCurrent = reachedIdx >= idx;
              const isCurrent = currentStatus === step;
              const stepTime = getStatusTimestamp(step);

              return (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: '80px', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPastOrCurrent ? '#0d7a2f' : '#e2e8f0',
                      color: isPastOrCurrent ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      boxShadow: isCurrent ? '0 0 0 4px #bbf7d0' : 'none',
                    }}
                  >
                    {isPastOrCurrent ? '✓' : idx + 1}
                  </div>
                  <span style={{ marginTop: '6px', fontSize: '0.85rem', fontWeight: isCurrent ? 'bold' : 'normal', color: isPastOrCurrent ? '#0f172a' : '#94a3b8' }}>
                    {step}
                  </span>
                  {stepTime && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {stepTime}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Courier Shipment Details if Dispatched (FR-18 / FR-21) */}
        {shipments.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>📦 Consignment Shipment Details</h4>
            {shipments.map((s) => (
              <div key={s.id} style={{ fontSize: '0.9rem', color: '#334155' }}>
                <span><strong>Courier:</strong> {s.courier}</span> &nbsp;|&nbsp;
                <span><strong>Tracking No:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{s.trackingNo}</code></span> &nbsp;|&nbsp;
                <span><strong>Dispatched:</strong> {new Date(s.dispatchDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cancellation and Return Controls */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {isCancellable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '0.85rem', minWidth: '220px' }}
              />
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                style={{
                  padding: '7px 16px',
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Cancellation is permitted anytime prior to dispatch.
              </span>
            </div>
          )}

          {isShipped && (
            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
              ℹ️ Order is dispatched and in transit. Cancellation is no longer available. You may request a return within 7 days once delivered.
            </div>
          )}

          {isReturnable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Reason for return (optional)"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '0.85rem', minWidth: '220px' }}
              />
              <button
                type="button"
                onClick={handleReturnOrder}
                disabled={returning}
                style={{
                  padding: '7px 16px',
                  background: '#6b21a8',
                  borderColor: '#6b21a8',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {returning ? 'Submitting…' : 'Request Return'}
              </button>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Return request permitted within 7 days of delivery (SRS BR-06).
              </span>
            </div>
          )}
        </div>
      </section>

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ color: '#0d7a2f', margin: '0 0 8px 0' }}>✅ Payment Confirmed</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    Your payment for order <strong>{order.orderNo}</strong> has been signature-verified and confirmed. Stock has been reserved.
                  </p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#475569' }}>
                    A tax invoice has been generated and e-mailed to <strong>{user.email}</strong>.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      background: '#1d4ed8',
                      borderColor: '#1d4ed8',
                      color: '#ffffff',
                      cursor: 'pointer',
                      borderRadius: '6px',
                    }}
                  >
                    {downloadingInvoice ? 'Generating PDF…' : '📄 Download Invoice (PDF)'}
                  </button>
                </div>
              </div>
              {invoiceError && (
                <div className="error" style={{ marginTop: '12px', padding: '8px 12px' }}>
                  {invoiceError}
                </div>
              )}
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

          {isConfirmed && (
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="secondary"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <span>📄</span> {downloadingInvoice ? 'Downloading…' : 'Download Tax Invoice'}
              </button>
            </div>
          )}

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
