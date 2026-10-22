// FR-13: Shopping Cart page with line quantities and proceed to checkout.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function Cart() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadCart = () => {
    setLoading(true);
    api.get('/cart')
      .then((res) => {
        setCart(res.data);
        setError(null);
      })
      .catch((err) => setError(readError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ready || !user || user.role !== 'BUYER') return;
    loadCart();
  }, [user, ready]);

  if (!ready) return <main className="page"><p className="muted">Loading…</p></main>;

  if (!user || user.role !== 'BUYER') {
    return (
      <main className="page">
        <h1>Shopping Cart</h1>
        <p>Please <Link to="/login">sign in</Link> as a buyer to view your cart.</p>
      </main>
    );
  }

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1 || newQty > 10) return;
    setBusyId(itemId);
    try {
      const res = await api.patch(`/cart/items/${itemId}`, { quantity: newQty });
      setCart(res.data);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (itemId) => {
    setBusyId(itemId);
    try {
      await api.delete(`/cart/items/${itemId}`);
      loadCart();
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const items = cart?.items || [];
  const activeItems = items.filter((x) => x.isActive && x.inStock);
  const itemTotal = cart?.itemTotal || 0;
  const isFreeShipping = itemTotal >= 50000;
  const remainingForFreeShipping = 50000 - itemTotal;

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h1>Shopping Cart {items.length > 0 && <span className="muted" style={{ fontSize: '1rem', fontWeight: 'normal' }}>({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})</span>}</h1>
        <Link to="/" style={{ textDecoration: 'none' }}>&larr; Continue shopping</Link>
      </div>

      {error && (
        <div className="error" style={{ padding: '10px 14px', marginBottom: '16px', background: '#fdf2f2', border: '1px solid #e09494', borderRadius: '6px' }} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading your cart…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', border: '1px dashed var(--line)', borderRadius: '8px', margin: '24px 0' }}>
          <h2>Your cart is empty</h2>
          <p className="muted" style={{ maxWidth: '440px', margin: '8px auto 20px auto' }}>
            Looks like you haven&apos;t added any books to your cart yet.
          </p>
          <button type="button" onClick={() => navigate('/')}>
            Explore Books
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const book = item.book || {};
                    const isBusy = busyId === item.id;
                    const maxQty = Math.min(10, item.stockQty || 10);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <Link to={`/books/${book.id}`} style={{ fontWeight: 'bold' }}>
                              {book.title || 'Untitled'}
                            </Link>
                          </div>
                          <div className="muted" style={{ fontSize: '0.85rem' }}>
                            {book.author} · {item.listing?.condition?.toLowerCase()}
                          </div>
                          {!item.inStock && (
                            <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {item.stockQty === 0 ? 'Out of stock' : `Only ${item.stockQty} left`}
                            </span>
                          )}
                        </td>
                        <td>{rupees(item.currentPrice)}</td>
                        <td>
                          <select
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(item.id, Number(e.target.value))}
                            disabled={isBusy || !item.isActive}
                            style={{ width: '60px', padding: '4px' }}
                          >
                            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{rupees(item.lineTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="link"
                            onClick={() => handleRemove(item.id)}
                            disabled={isBusy}
                            style={{ color: 'var(--error)', fontSize: '0.85rem' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', background: '#fafafa' }}>
            <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>Order Summary</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Items Total:</span>
              <span>{rupees(itemTotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Shipping:</span>
              <span style={{ color: isFreeShipping ? '#0d7a2f' : 'inherit', fontWeight: isFreeShipping ? 'bold' : 'normal' }}>
                {isFreeShipping ? 'FREE' : '₹40.00'}
              </span>
            </div>

            {!isFreeShipping && remainingForFreeShipping > 0 && (
              <p className="muted" style={{ fontSize: '0.8rem', background: '#eef3fa', padding: '6px 8px', borderRadius: '4px' }}>
                Add {rupees(remainingForFreeShipping)} more to get <strong>FREE delivery</strong>!
              </p>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={activeItems.length === 0}
              style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
            >
              Proceed to Checkout &rarr;
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
