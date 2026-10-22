// FR-10, FR-12 and FR-14: every active offer by ascending price; related titles; save to wishlist.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [wishlistListingIds, setWishlistListingIds] = useState(new Set());
  const [busyListingId, setBusyListingId] = useState(null);

  useEffect(() => {
    setData(null);
    setNotice(null);
    api.get(`/books/${id}`).then((r) => setData(r.data)).catch((e) => setError(readError(e).message));
    api.get(`/books/${id}/related`).then((r) => setRelated(r.data.items)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (user && user.role === 'BUYER') {
      api.get('/wishlist')
        .then((res) => {
          const ids = new Set((res.data.items || []).map((x) => x.listingId));
          setWishlistListingIds(ids);
        })
        .catch(() => {});
    } else {
      setWishlistListingIds(new Set());
    }
  }, [user]);

  const handleSaveToWishlist = async (listingId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'BUYER') {
      setError('Only buyer accounts can save items to a wishlist.');
      return;
    }

    setBusyListingId(listingId);
    setError(null);
    setNotice(null);

    try {
      if (wishlistListingIds.has(listingId)) {
        await api.delete(`/wishlist/${listingId}`);
        setWishlistListingIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        setNotice('Removed from your wishlist.');
      } else {
        await api.post('/wishlist', { listingId });
        setWishlistListingIds((prev) => new Set([...prev, listingId]));
        setNotice(
          <span>
            Saved to your wishlist! <Link to="/wishlist" style={{ fontWeight: 'bold' }}>View Wishlist &rarr;</Link>
          </span>,
        );
      }
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyListingId(null);
    }
  };

  if (error) return <main className="page"><p className="error" role="alert">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;
  const { book, offers } = data;

  return (
    <main className="page">
      <h1>{book.title}</h1>
      <p className="muted">{book.author} · {book.publisher} · {book.language} · ISBN {book.isbn13}</p>
      <p>MRP {rupees(book.mrp)} · ★ {book.avgRating} ({book.reviewCount} reviews)</p>

      {notice && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', background: '#eaf5ea', border: '1px solid #7bc67b', borderRadius: '6px' }} role="status">
          {notice}
        </div>
      )}

      <h2>Offers</h2>
      {offers.length === 0 ? <p>No seller currently has this title in stock.</p> : (
        <table>
          <thead>
            <tr>
              <th>Condition</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Availability</th>
              <th aria-label="Actions" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const isSaved = wishlistListingIds.has(o.listingId);
              const isBusy = busyListingId === o.listingId;

              return (
                <tr key={o.listingId}>
                  <td>{o.condition.replace('_', ' ').toLowerCase()}</td>
                  <td>{rupees(o.price)}</td>
                  <td>{o.seller.name}</td>
                  <td>{o.inStock ? `${o.stockQty} in stock` : 'Out of stock'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveToWishlist(o.listingId)}
                        disabled={isBusy}
                        style={{
                          background: isSaved ? '#fff' : 'var(--accent)',
                          color: isSaved ? 'var(--accent)' : '#fff',
                          border: '1px solid var(--accent)',
                          padding: '6px 12px',
                          fontSize: '0.85rem',
                        }}
                        title={isSaved ? 'Remove from wishlist' : 'Save to wishlist for later'}
                      >
                        {isBusy ? 'Saving…' : isSaved ? '♥ Saved' : '♡ Save to Wishlist'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {related.length > 0 && (
        <>
          <h2>Related titles</h2>
          <ul className="related">{related.map((r) => <li key={r.id}><Link to={`/books/${r.id}`}>{r.title}</Link> <span className="muted">{r.author}</span></li>)}</ul>
        </>
      )}
    </main>
  );
}
