// FR-14: Wishlist page (save books to buy later, move to cart in one action).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function Wishlist() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchWishlist = () => {
    setLoading(true);
    api.get('/wishlist')
      .then((res) => {
        setItems(res.data.items || []);
        setError(null);
      })
      .catch((err) => {
        setError(readError(err).message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    if (user.role !== 'BUYER') return;
    fetchWishlist();
  }, [user, ready]);

  if (!ready) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Wishlist</h1>
        <p>Please <Link to="/login">sign in</Link> as a buyer to view your saved books.</p>
      </main>
    );
  }

  if (user.role !== 'BUYER') {
    return (
      <main className="page">
        <h1>Wishlist</h1>
        <p className="error">Wishlist is only available for buyer accounts.</p>
      </main>
    );
  }

  const handleRemove = async (id, title) => {
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      await api.delete(`/wishlist/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice(`Removed "${title || 'item'}" from your wishlist.`);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveToCart = async (id, title) => {
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      await api.post(`/wishlist/${id}/move-to-cart`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice(`Moved "${title || 'item'}" to your cart!`);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h1>My Wishlist {items.length > 0 && <span className="muted" style={{ fontSize: '1rem', fontWeight: 'normal' }}>({items.length} {items.length === 1 ? 'item' : 'items'})</span>}</h1>
        <Link to="/" style={{ textDecoration: 'none' }}>&larr; Continue browsing</Link>
      </div>

      <p className="muted" style={{ marginTop: '-4px', marginBottom: '16px' }}>
        Books you've saved to purchase later without buying immediately.
      </p>

      {notice && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '6px' }} role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="error" style={{ padding: '10px 14px', marginBottom: '16px', background: '#fdf2f2', border: '1px solid #e09494', borderRadius: '6px' }} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading your saved books…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', border: '1px dashed var(--line)', borderRadius: '8px', margin: '24px 0' }}>
          <h2>Your wishlist is empty</h2>
          <p className="muted" style={{ maxWidth: '440px', margin: '8px auto 20px auto' }}>
            Explore our catalogue and click &ldquo;Save to Wishlist&rdquo; on any book offer to keep track of titles you want to read.
          </p>
          <button type="button" onClick={() => navigate('/')}>
            Explore Catalogue
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Cover</th>
                <th>Title & Details</th>
                <th>Condition</th>
                <th>Price</th>
                <th>Availability</th>
                <th aria-label="Actions" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const book = item.book || {};
                const listing = item.listing || {};
                const isOutOfStock = !listing.inStock;
                const isBusy = busyId === item.id;

                return (
                  <tr key={item.id}>
                    <td>
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div
                          className="cover-ph"
                          style={{ width: '48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}
                          aria-hidden="true"
                        >
                          No cover
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        {book.id ? (
                          <Link to={`/books/${book.id}`} style={{ fontWeight: 'bold' }}>
                            {book.title}
                          </Link>
                        ) : (
                          <strong>{book.title || 'Untitled'}</strong>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {book.author} {book.publisher && `· ${book.publisher}`}
                      </div>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>
                        Seller: {listing.seller?.name || 'Verified Seller'}
                      </div>
                    </td>
                    <td>
                      <span className="chip" style={{ fontSize: '0.8rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {(listing.condition || 'Good').replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{rupees(listing.price)}</div>
                      {book.mrp && book.mrp > listing.price && (
                        <div className="muted" style={{ fontSize: '0.75rem', textDecoration: 'line-through' }}>
                          MRP {rupees(book.mrp)}
                        </div>
                      )}
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span style={{ color: 'var(--error)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          Out of stock
                        </span>
                      ) : (
                        <span style={{ color: '#0d7a2f', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {listing.stockQty} in stock
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveToCart(item.id, book.title)}
                          disabled={isOutOfStock || isBusy}
                          title={isOutOfStock ? 'Item is currently out of stock' : 'Move to cart and remove from wishlist'}
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          {isBusy ? 'Moving…' : 'Move to Cart'}
                        </button>
                        <button
                          type="button"
                          className="link"
                          onClick={() => handleRemove(item.id, book.title)}
                          disabled={isBusy}
                          style={{ fontSize: '0.85rem', color: 'var(--error)', cursor: 'pointer' }}
                          title="Remove from wishlist"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
