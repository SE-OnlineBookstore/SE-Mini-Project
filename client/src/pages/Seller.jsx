// S3-03: seller page. FR-19 (add a listing from an ISBN-13), FR-20 (edit price and stock),
// FR-21 (fulfil order items: accept, pack, dispatch, deliver) and FR-22 (sales dashboard for a date range).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError, rupees } from '../api/client';
import Field from '../components/Field';

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'ACCEPTABLE', label: 'Acceptable' },
];

const toPaise = (rupeeText) => {
  const n = Number(rupeeText);
  return Number.isFinite(n) && rupeeText !== '' ? Math.round(n * 100) : NaN;
};

const isoDate = (d) => d.toISOString().slice(0, 10);

function AddListing({ onAdded }) {
  const [form, setForm] = useState({ isbn13: '', condition: 'NEW', price: '', stock: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const price = toPaise(form.price);
    const stock = Number(form.stock);
    const local = {};
    if (!/^\d{13}$/.test(form.isbn13.trim())) local.isbn13 = 'Enter the 13 digits of the ISBN-13, without dashes.';
    if (!Number.isInteger(price) || price < 1) local.price = 'Enter a price in rupees, for example 249.50.';
    if (!Number.isInteger(stock) || stock < 0) local.stock = 'Enter a whole number of copies, 0 or more.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      await api.post('/seller/listings', {
        isbn13: form.isbn13.trim(),
        condition: form.condition,
        price,
        stock_qty: stock,
      });
      setMessage({ ok: true, text: 'Listing added.' });
      setForm({ isbn13: '', condition: 'NEW', price: '', stock: '' });
      onAdded();
    } catch (err) {
      const { message: text, fields } = readError(err);
      setErrors({ isbn13: fields.isbn13, price: fields.price, stock: fields.stock_qty });
      setMessage({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Add a listing">
      <h3>Add a listing</h3>
      <Field id="isbn13" label="ISBN-13" value={form.isbn13} onChange={set('isbn13')} error={errors.isbn13} inputMode="numeric" />
      <div className="field">
        <label htmlFor="condition">Condition</label>
        <select id="condition" value={form.condition} onChange={set('condition')}>
          {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <Field id="price" label="Price (₹)" value={form.price} onChange={set('price')} error={errors.price} inputMode="decimal" />
      <Field id="stock" label="Copies in stock" value={form.stock} onChange={set('stock')} error={errors.stock} inputMode="numeric" />
      <button type="submit" disabled={busy}>{busy ? 'Adding...' : 'Add listing'}</button>
      {message && <p role="status" className={message.ok ? 'muted' : 'error'}>{message.text}</p>}
    </form>
  );
}

function ListingRow({ listing, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setPrice((listing.price / 100).toFixed(2));
    setStock(String(listing.stockQty));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const newPrice = toPaise(price);
    const newStock = Number(stock);
    if (!Number.isInteger(newPrice) || newPrice < 1) { setError('Enter a valid price in rupees.'); return; }
    if (!Number.isInteger(newStock) || newStock < 0) { setError('Enter a whole number of copies, 0 or more.'); return; }
    const body = {};
    if (newPrice !== listing.price) body.price = newPrice;
    if (newStock !== listing.stockQty) body.stock_qty = newStock;
    if (!Object.keys(body).length) { setEditing(false); return; }

    setBusy(true);
    setError(null);
    try {
      await api.patch(`/seller/listings/${listing.id}`, body);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>{listing.title || '-'}</td>
      <td>{listing.condition}</td>
      <td>
        {editing
          ? <input aria-label={`Price for ${listing.title}`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          : rupees(listing.price)}
      </td>
      <td>
        {editing
          ? <input aria-label={`Stock for ${listing.title}`} value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
          : listing.stockQty}
      </td>
      <td>{listing.status}</td>
      <td>
        {editing ? (
          <>
            <button type="button" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>{' '}
            <button type="button" className="link" onClick={() => setEditing(false)}>Cancel</button>
            {error && <div role="alert" className="error">{error}</div>}
          </>
        ) : (
          <button type="button" className="link" onClick={startEdit}>Edit price and stock</button>
        )}
      </td>
    </tr>
  );
}

function MyListings() {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.get('/seller/listings')
      .then((r) => { setListings(r.data.listings); setError(null); })
      .catch((e) => setError(readError(e).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="listings-h">
      <h2 id="listings-h">My listings</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {!listings && !error && <p className="muted">Loading your listings...</p>}
      {listings && listings.length === 0 && <p className="muted">You have no listings yet. Add one below.</p>}
      {listings && listings.length > 0 && (
        <table>
          <thead>
            <tr><th>Title</th><th>Condition</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {listings.map((l) => <ListingRow key={l.id} listing={l} onSaved={load} />)}
          </tbody>
        </table>
      )}
      <AddListing onAdded={load} />
    </section>
  );
}

const NEXT_ACTION = {
  PLACED: { action: 'accept', label: 'Accept' },
  CONFIRMED: { action: 'pack', label: 'Mark packed' },
  PACKED: { action: 'dispatch', label: 'Dispatch' },
  SHIPPED: { action: 'deliver', label: 'Mark delivered' },
};

function OrderItemRow({ item, onChanged }) {
  const [courier, setCourier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const next = NEXT_ACTION[item.itemStatus];

  const run = async () => {
    setError(null);
    let body;
    if (next.action === 'dispatch') {
      if (!courier.trim() || !trackingNo.trim()) { setError('Enter the courier and the tracking number.'); return; }
      body = { courier: courier.trim(), trackingNo: trackingNo.trim() };
    }
    setBusy(true);
    try {
      await api.post(`/seller/fulfilment/${item.id}/${next.action}`, body);
      onChanged();
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>{item.orderNo || '-'}</td>
      <td>{item.title}</td>
      <td>{item.quantity}</td>
      <td>{rupees(item.unitPrice)}</td>
      <td>{item.itemStatus}</td>
      <td>
        {next ? (
          <>
            {next.action === 'dispatch' && (
              <div>
                <input aria-label={`Courier for ${item.title}`} placeholder="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} />{' '}
                <input aria-label={`Tracking number for ${item.title}`} placeholder="Tracking no." value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} />
              </div>
            )}
            <button type="button" onClick={run} disabled={busy}>{busy ? 'Working...' : next.label}</button>
            {error && <div role="alert" className="error">{error}</div>}
          </>
        ) : <span className="muted">No action</span>}
      </td>
    </tr>
  );
}

function Fulfilment() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.get('/seller/orders')
      .then((r) => { setItems(r.data.items); setError(null); })
      .catch((e) => setError(readError(e).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="orders-h">
      <h2 id="orders-h">Orders to fulfil</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {!items && !error && <p className="muted">Loading your orders...</p>}
      {items && items.length === 0 && <p className="muted">No orders yet.</p>}
      {items && items.length > 0 && (
        <table>
          <thead>
            <tr><th>Order</th><th>Title</th><th>Qty</th><th>Price</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {items.map((i) => <OrderItemRow key={i.id} item={i} onChanged={load} />)}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Dashboard() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.get('/seller/dashboard', { params: { from, to } });
      setData(r.data.data);
    } catch (err) {
      setData(null);
      setError(readError(err).message);
    } finally {
      setBusy(false);
    }
  };

  // The first view loads straight away for the default range.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const s = data && data.summary;

  return (
    <section aria-labelledby="dash-h">
      <h2 id="dash-h">Sales dashboard</h2>
      <form onSubmit={load} className="date-range">
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Loading...' : 'Show'}</button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {s && (
        <>
          <table>
            <tbody>
              <tr><th scope="row">Units sold</th><td>{s.unitsSold}</td></tr>
              <tr><th scope="row">Gross revenue</th><td>{rupees(s.grossRevenue)}</td></tr>
              <tr><th scope="row">Returned units</th><td>{s.returnedUnits}</td></tr>
              <tr><th scope="row">Returned revenue</th><td>{rupees(s.returnedRevenue)}</td></tr>
              <tr><th scope="row">Commission</th><td>{rupees(s.commission)}</td></tr>
              <tr><th scope="row">Net settlement</th><td>{rupees(s.netSettlement)}</td></tr>
            </tbody>
          </table>
          <p className="hint">{s.settlementNote}</p>
          {data.orders.length === 0
            ? <p className="muted">No orders in this date range.</p>
            : (
              <table>
                <thead>
                  <tr><th>Order</th><th>Date</th><th>Status</th><th>Units</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.orderId}>
                      <td>{o.orderNo}</td>
                      <td>{new Date(o.date).toLocaleDateString()}</td>
                      <td>{o.status}</td>
                      <td>{o.units}</td>
                      <td>{rupees(o.grossRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </>
      )}
    </section>
  );
}

export default function Seller() {
  const { user, ready } = useAuth();

  if (!ready) return <main className="page"><p className="muted">Loading...</p></main>;
  if (!user) {
    return (
      <main className="page">
        <h1>Seller page</h1>
        <p>Please <Link to="/login">sign in</Link> with a seller account.</p>
      </main>
    );
  }
  if (user.role !== 'SELLER') {
    return (
      <main className="page">
        <h1>Seller page</h1>
        <p className="error" role="alert">This page is only for seller accounts.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Seller page</h1>
      <MyListings />
      <Fulfilment />
      <Dashboard />
    </main>
  );
}
