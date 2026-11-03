import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError } from '../api/client';

const emptyAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

export default function Profile() {
  const { user, ready, updateUser } = useAuth();

  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const [profileRes, addressRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/addresses'),
      ]);

      setProfile({
        name: profileRes.data.user.name || '',
        phone: profileRes.data.user.phone || '',
      });

      setAddresses(addressRes.data.items || []);
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === 'BUYER') {
      loadProfile();
    }
  }, [ready, user]);

  const handleProfileChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setNotice('');
    setFieldErrors({});

    try {
      const { data } = await api.patch('/users/me', profile);
      setProfile({
        name: data.user.name || '',
        phone: data.user.phone || '',
      });
      updateUser(data.user);
      setNotice('Profile updated successfully.');
    } catch (err) {
      const result = readError(err);
      setError(result.message);
      setFieldErrors(result.fields || {});
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value, checked, type } = e.target;

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetAddressForm = () => {
    setAddressForm(emptyAddress);
    setEditingId(null);
    setFieldErrors({});
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setError('');
    setNotice('');
    setFieldErrors({});

    try {
      if (editingId) {
        await api.patch(`/users/me/addresses/${editingId}`, addressForm);
        setNotice('Address updated successfully.');
      } else {
        await api.post('/users/me/addresses', addressForm);
        setNotice('Address added successfully.');
      }

      resetAddressForm();
      const { data } = await api.get('/users/me/addresses');
      setAddresses(data.items || []);
    } catch (err) {
      const result = readError(err);
      setError(result.message);
      setFieldErrors(result.fields || {});
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingId(address.id);
    setAddressForm({
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      isDefault: address.isDefault || false,
    });
    setFieldErrors({});
    setNotice('');
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setBusyId(id);
    setError('');
    setNotice('');

    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses((prev) => prev.filter((address) => address.id !== id));
      setNotice('Address deleted successfully.');

      if (editingId === id) {
        resetAddressForm();
      }
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const fieldError = (name) =>
    fieldErrors[name] || fieldErrors[`body.${name}`];

  if (!ready) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  if (!user) {
    return (
      <main className="page">
        <h1>My Profile</h1>
        <p>Please <Link to="/login">sign in</Link> to view your profile.</p>
      </main>
    );
  }

  if (user.role !== 'BUYER') {
    return (
      <main className="page">
        <h1>My Profile</h1>
        <p className="error">Profile and address book are only available for buyer accounts.</p>
      </main>
    );
  }

  if (loading) {
    return <main className="page"><p className="muted">Loading your profile…</p></main>;
  }

  return (
    <main className="page">
      <h1>My Profile</h1>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p role="status" style={{ color: '#0d7a2f' }}>{notice}</p>}

      <section className="card" style={{ marginBottom: '24px' }}>
        <h2>Profile Details</h2>

        <form onSubmit={handleProfileSubmit}>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" type="email" value={user.email || ''} disabled />
          </div>

          <div className="field">
            <label htmlFor="profile-name">Full name</label>
            <input
              id="profile-name"
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              minLength={2}
              maxLength={60}
              required
            />
            {fieldError('name') && <span className="error">{fieldError('name')}</span>}
          </div>

          <div className="field">
            <label htmlFor="profile-phone">Phone number</label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={handleProfileChange}
              maxLength={10}
              pattern="[0-9]{10}"
              required
            />
            {fieldError('phone') && <span className="error">{fieldError('phone')}</span>}
            <p className="hint">Enter a 10-digit phone number.</p>
          </div>

          <button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </section>

      <section>
        <h2>My Delivery Addresses</h2>

        {addresses.length === 0 ? (
          <p className="muted">You haven't added any delivery addresses yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {addresses.map((address) => (
              <article className="card" key={address.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <strong>
                    {address.isDefault ? 'Default Address' : 'Delivery Address'}
                  </strong>
                  {address.isDefault && <span className="chip">Default</span>}
                </div>

                <p style={{ margin: '4px 0' }}>
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => handleEditAddress(address)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="link"
                    disabled={busyId === address.id}
                    onClick={() => handleDeleteAddress(address.id)}
                    style={{ color: 'var(--error)' }}
                  >
                    {busyId === address.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{editingId ? 'Edit Address' : 'Add New Address'}</h2>

        <form onSubmit={handleAddressSubmit}>
          <div className="field">
            <label htmlFor="line1">Address Line 1</label>
            <input
              id="line1"
              name="line1"
              value={addressForm.line1}
              onChange={handleAddressChange}
              maxLength={120}
              required
            />
            {fieldError('line1') && <span className="error">{fieldError('line1')}</span>}
          </div>

          <div className="field">
            <label htmlFor="line2">Address Line 2 (optional)</label>
            <input
              id="line2"
              name="line2"
              value={addressForm.line2}
              onChange={handleAddressChange}
              maxLength={120}
            />
            {fieldError('line2') && <span className="error">{fieldError('line2')}</span>}
          </div>

          <div className="field">
            <label htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              value={addressForm.city}
              onChange={handleAddressChange}
              maxLength={60}
              required
            />
            {fieldError('city') && <span className="error">{fieldError('city')}</span>}
          </div>

          <div className="field">
            <label htmlFor="state">State</label>
            <input
              id="state"
              name="state"
              value={addressForm.state}
              onChange={handleAddressChange}
              maxLength={60}
              required
            />
            {fieldError('state') && <span className="error">{fieldError('state')}</span>}
          </div>

          <div className="field">
            <label htmlFor="pincode">PIN Code</label>
            <input
              id="pincode"
              name="pincode"
              value={addressForm.pincode}
              onChange={handleAddressChange}
              maxLength={6}
              pattern="[1-9][0-9]{5}"
              required
            />
            {fieldError('pincode') && <span className="error">{fieldError('pincode')}</span>}
          </div>

          <div className="field" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <input
              id="isDefault"
              name="isDefault"
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={handleAddressChange}
              style={{ width: 'auto' }}
            />
            <label htmlFor="isDefault">Set as default address</label>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={savingAddress}>
              {savingAddress ? 'Saving…' : editingId ? 'Update Address' : 'Add Address'}
            </button>

            {editingId && (
              <button type="button" className="link" onClick={resetAddressForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}