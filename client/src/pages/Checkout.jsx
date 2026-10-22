// FR-15: Checkout page (address selection, coupon application, line revalidation, order placement).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function Checkout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [couponError, setCouponError] = useState(null);

  // New address inline form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ line1: '', line2: '', city: '', state: '', pincode: '', isDefault: true });
  const [addrError, setAddrError] = useState(null);
  const [addingAddr, setAddingAddr] = useState(false);

  const fetchAddressesAndPreview = async (couponToApply = appliedCoupon) => {
    setLoading(true);
    setError(null);
    try {
      const [addrRes, prevRes] = await Promise.all([
        api.get('/users/me/addresses'),
        api.get('/checkout/preview', { params: { couponCode: couponToApply || undefined } }),
      ]);

      const addrs = addrRes.data.items || [];
      setAddresses(addrs);
      setPreview(prevRes.data);

      if (!selectedAddressId && addrs.length > 0) {
        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !user || user.role !== 'BUYER') return;
    fetchAddressesAndPreview();
  }, [user, ready]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    setCouponError(null);
    try {
      const res = await api.post('/checkout/validate-coupon', { code: couponCodeInput.trim() });
      setAppliedCoupon(couponCodeInput.trim().toUpperCase());
      setPreview((prev) => ({
        ...prev,
        discount: res.data.discount,
        payableAmount: res.data.payableAmount,
        coupon: res.data.coupon,
      }));
    } catch (err) {
      setCouponError(readError(err).message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponCodeInput('');
    setCouponError(null);
    fetchAddressesAndPreview('');
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    setAddrError(null);
    setAddingAddr(true);
    try {
      const res = await api.post('/users/me/addresses', newAddr);
      const created = res.data.address;
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setNewAddr({ line1: '', line2: '', city: '', state: '', pincode: '', isDefault: true });
    } catch (err) {
      setAddrError(readError(err).message);
    } finally {
      setAddingAddr(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a delivery address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/checkout', {
        addressId: selectedAddressId,
        couponCode: appliedCoupon || undefined,
      });
      navigate(`/orders/${res.data.order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(readError(err).message);
      setSubmitting(false);
    }
  };

  if (!ready) return <main className="page"><p className="muted">Loading…</p></main>;

  if (!user || user.role !== 'BUYER') {
    return (
      <main className="page">
        <h1>Checkout</h1>
        <p>Please <Link to="/login">sign in</Link> as a buyer to check out.</p>
      </main>
    );
  }

  const lines = preview?.lines || [];
  const errors = preview?.errors || [];
  const warnings = preview?.warnings || [];

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1>Checkout</h1>
        <Link to="/cart" style={{ textDecoration: 'none' }}>&larr; Back to cart</Link>
      </div>

      {error && (
        <div className="error" style={{ padding: '12px 16px', marginBottom: '16px', background: '#fdf2f2', border: '1px solid #e09494', borderRadius: '6px' }} role="alert">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px' }} role="status">
          <strong>Notice:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            {warnings.map((w, idx) => (
              <li key={idx}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="error" style={{ padding: '12px 16px', marginBottom: '16px', background: '#fdf2f2', border: '1px solid #e09494', borderRadius: '6px' }} role="alert">
          <strong>Cannot proceed with checkout:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            {errors.map((errItem, idx) => (
              <li key={idx}>{errItem.message}</li>
            ))}
          </ul>
          <p style={{ marginTop: '8px' }}><Link to="/cart">Return to cart to adjust items &rarr;</Link></p>
        </div>
      )}

      {loading ? (
        <p className="muted">Preparing your checkout…</p>
      ) : lines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <h2>Your cart is empty</h2>
          <p><Link to="/">Return to catalogue</Link></p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          <div>
            {/* Delivery Address Section */}
            <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>1. Delivery Address</h2>
                {!showAddressForm && (
                  <button type="button" className="link" onClick={() => setShowAddressForm(true)}>
                    + Add New Address
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form onSubmit={handleAddNewAddress} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                  <h3>New Delivery Address</h3>
                  {addrError && <p className="error">{addrError}</p>}
                  <div className="field">
                    <label>Street Address</label>
                    <input
                      required
                      value={newAddr.line1}
                      onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                      placeholder="Flat, House no., Building, Company, Apartment"
                    />
                  </div>
                  <div className="field">
                    <label>Area / Street (Optional)</label>
                    <input
                      value={newAddr.line2}
                      onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                      placeholder="Area, Sector, Village"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '8px' }}>
                    <div className="field">
                      <label>City</label>
                      <input
                        required
                        value={newAddr.city}
                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>State</label>
                      <input
                        required
                        value={newAddr.state}
                        onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>PIN Code</label>
                      <input
                        required
                        pattern="^[1-9][0-9]{5}$"
                        maxLength="6"
                        value={newAddr.pincode}
                        onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                        placeholder="6 digits"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="submit" disabled={addingAddr}>
                      {addingAddr ? 'Saving…' : 'Save & Select Address'}
                    </button>
                    <button type="button" className="link" onClick={() => setShowAddressForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : addresses.length === 0 ? (
                <div>
                  <p className="muted">No delivery addresses found.</p>
                  <button type="button" onClick={() => setShowAddressForm(true)}>Add Address</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px',
                        border: selectedAddressId === a.id ? '2px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedAddressId === a.id ? '#f0f7ff' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={a.id}
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)}
                        style={{ width: 'auto', marginTop: '4px' }}
                      />
                      <div>
                        <strong>{a.line1}</strong>
                        {a.line2 && <div>{a.line2}</div>}
                        <div className="muted">{a.city}, {a.state} - {a.pincode}</div>
                        {a.isDefault && <span className="chip" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Default</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Items in Order */}
            <section style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>2. Order Items</h2>
              <table>
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((item) => (
                    <tr key={item.cartItemId}>
                      <td>
                        <strong>{item.title}</strong>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>{item.author} ({item.condition?.toLowerCase()})</div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{rupees(item.currentPrice)}</td>
                      <td style={{ fontWeight: 'bold' }}>{rupees(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Checkout Summary & Coupon Box */}
          <aside style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', background: '#fafafa' }}>
            <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>Order Summary</h2>

            {/* Coupon Application Box */}
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fff', border: '1px solid var(--line)', borderRadius: '6px' }}>
              <label htmlFor="coupon-input" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '6px' }}>
                Coupon Code
              </label>

              {appliedCoupon ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eaf5ea', padding: '6px 10px', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0d7a2f' }}>✓ {appliedCoupon}</span>
                  <button type="button" className="link" onClick={handleRemoveCoupon} style={{ color: 'var(--error)', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="coupon-input"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. FLAT50"
                    style={{ textTransform: 'uppercase', padding: '6px' }}
                  />
                  <button type="submit" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    Apply
                  </button>
                </form>
              )}

              {couponError && <p className="error" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{couponError}</p>}
            </div>

            {/* Cost Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Items Subtotal:</span>
              <span>{rupees(preview?.itemTotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Delivery Fee:</span>
              <span style={{ color: preview?.shippingFee === 0 ? '#0d7a2f' : 'inherit', fontWeight: preview?.shippingFee === 0 ? 'bold' : 'normal' }}>
                {preview?.shippingFee === 0 ? 'FREE' : rupees(preview?.shippingFee)}
              </span>
            </div>

            {preview?.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#0d7a2f', fontWeight: 'bold' }}>
                <span>Coupon Discount:</span>
                <span>-{rupees(preview?.discount)}</span>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <span>Total Payable:</span>
              <span style={{ color: 'var(--accent)' }}>{rupees(preview?.payableAmount)}</span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddressId || errors.length > 0}
              style={{ width: '100%', padding: '12px', fontSize: '1.05rem', fontWeight: 'bold' }}
            >
              {submitting ? 'Placing Order…' : 'Place Order & Purchase'}
            </button>

            {!selectedAddressId && (
              <p className="hint" style={{ textAlign: 'center', marginTop: '8px' }}>
                Please select or add a delivery address to place your order.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
