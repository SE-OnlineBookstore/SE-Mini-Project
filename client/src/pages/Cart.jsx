// FR-13: Shopping Cart Page
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { readError, rupees } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyItem, setBusyItem] = useState(null);

  const fetchCart = async () => {
    try {
      setError(null);
      const res = await api.get('/cart');
      setCart(res.data);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [user]);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1 || newQuantity > 10) return;
    setBusyItem(itemId);
    setError(null);
    try {
      const res = await api.patch(`/cart/items/${itemId}`, { quantity: newQuantity });
      setCart(res.data);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyItem(null);
    }
  };

  const removeItem = async (itemId) => {
    setBusyItem(itemId);
    setError(null);
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      setCart(res.data);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyItem(null);
    }
  };

  const clearCart = async () => {
    setError(null);
    try {
      const res = await api.delete('/cart');
      setCart(res.data);
    } catch (err) {
      setError(readError(err).message);
    }
  };

  if (!user) return null;
  if (loading) return <main className="page"><p className="muted">Loading cart…</p></main>;

  return (
    <main className="page">
      <h1>Shopping Cart</h1>
      {error && <p className="error" role="alert" style={{ marginBottom: '16px' }}>{error}</p>}

      {!cart || cart.items.length === 0 ? (
        <div>
          <p className="muted">Your cart is currently empty.</p>
          <p><Link to="/">Browse Catalogue</Link></p>
        </div>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.book ? (
                      <div>
                        <strong><Link to={`/books/${item.book.id}`}>{item.book.title}</Link></strong>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>{item.book.author} · ISBN {item.book.isbn13}</div>
                      </div>
                    ) : (
                      <span>Listing #{item.listingId}</span>
                    )}
                    {item.priceChanged && (
                      <span className="error" style={{ fontSize: '0.8rem', display: 'block' }}>
                        Price updated from {rupees(item.priceAtAdd)}
                      </span>
                    )}
                    {!item.isAvailable && (
                      <span className="error" style={{ fontSize: '0.8rem', display: 'block' }}>
                        Requested quantity exceeds stock ({item.availableStock} available)
                      </span>
                    )}
                  </td>
                  <td>{rupees(item.currentPrice)}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        style={{ padding: '2px 8px', minWidth: '28px' }}
                        disabled={busyItem === item.id || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.book?.title || 'book'}`}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        style={{ padding: '2px 8px', minWidth: '28px' }}
                        disabled={busyItem === item.id || item.quantity >= 10 || item.quantity >= item.availableStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.book?.title || 'book'}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td><strong>{rupees(item.lineTotal)}</strong></td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      style={{ color: 'var(--error)' }}
                      disabled={busyItem === item.id}
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.book?.title || 'item'} from cart`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <button type="button" className="link" onClick={clearCart} aria-label="Clear all items from cart">
              Clear Cart
            </button>
            <div style={{ textAlign: 'right', flex: '1 1 280px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>
                Total Items: <strong>{cart.totalItems}</strong> | Subtotal: <strong>{rupees(cart.subtotal)}</strong>
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <button type="button" style={{ background: '#f5f5f5', color: 'var(--ink)', borderColor: 'var(--line)' }} aria-label="Continue shopping in catalogue">
                    Continue Shopping
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  disabled={cart.items.some((i) => !i.isAvailable)}
                  aria-label="Proceed to Checkout"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
