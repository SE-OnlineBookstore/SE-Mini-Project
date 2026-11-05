
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError } from '../api/client';

export default function Admin() {
  const { user, ready } = useAuth();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [targetType, setTargetType] = useState('listing');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const downloadReport = async (format) => {
    setError('');
    setMessage('');

    try {
      const response = await api.get(
        `/admin/analytics/export/${format}`,
        {
          params: { month },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `platform-analytics-${month}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`${format.toUpperCase()} report downloaded successfully.`);
    } catch (err) {
      setError('Unable to download the report. Please try again.');
    }
  };

  const moderate = async (action) => {
    setError('');
    setMessage('');

    if (!targetId.trim() || !reason.trim()) {
      setError('Target ID and reason are required.');
      return;
    }

    setBusy(true);

    try {
      await api.patch(
        `/admin/moderation/${targetType}/${targetId}/${action}`,
        { reason }
      );

      setMessage(
        `${targetType} ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`
      );

      setTargetId('');
      setReason('');
    } catch (err) {
      setError(readError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <main className="page"><p>Loading…</p></main>;
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Admin Dashboard</h1>
        <p>Please <Link to="/login">sign in</Link> to continue.</p>
      </main>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <main className="page">
        <h1>Access denied</h1>
        <p className="error">Only administrators can access this page.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Admin Dashboard</h1>
      <p className="muted">Manage platform moderation and monthly reports.</p>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <section className="card" style={{ marginBottom: '24px' }}>
        <h2>Monthly Analytics</h2>

        <div className="field">
          <label htmlFor="report-month">Select month</label>
          <input
            id="report-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => downloadReport('csv')}>
            Download CSV
          </button>

          <button type="button" onClick={() => downloadReport('pdf')}>
            Download PDF
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Content Moderation</h2>
        <p className="muted">
          Enter the ID of the listing, user or review you want to moderate.
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="target-type">Target type</label>
            <select
              id="target-type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <option value="listing">Listing</option>
              <option value="user">User</option>
              <option value="review">Review</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="target-id">Target ID</label>
            <input
              id="target-id"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter the 24-character ID"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="moderation-reason">Reason</label>
            <textarea
              id="moderation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is required"
              maxLength={500}
              required
            />
            <p className="hint">{reason.length}/500 characters</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => moderate('block')}
            >
              {busy ? 'Processing…' : 'Block'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => moderate('unblock')}
            >
              {busy ? 'Processing…' : 'Unblock'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
