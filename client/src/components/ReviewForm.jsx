// FR-11 (S3-05): review form on the book page. Posts to the existing review endpoint; the API decides
// eligibility (REVIEW_NOT_ELIGIBLE) and duplicates (REVIEW_ALREADY_EXISTS) and its message is shown as-is.
import { useState } from 'react';
import api, { readError } from '../api/client';

export default function ReviewForm({ bookId, onPosted }) {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!rating) {
      setFieldErrors({ rating: 'Choose a rating from 1 to 5.' });
      return;
    }
    setBusy(true);
    try {
      const body = { rating: Number(rating) };
      if (comment.trim()) body.comment = comment.trim();
      const { data } = await api.post(`/books/${bookId}/reviews`, body);
      setDone(true);
      setRating('');
      setComment('');
      onPosted?.(data);
    } catch (err) {
      const r = readError(err);
      setError(r.message);
      setFieldErrors(r.fields);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginTop: '36px' }} aria-labelledby="review-heading">
      <h2 id="review-heading">Write a review</h2>
      <p className="muted">You can review a book once it has been delivered to you.</p>
      {done && <p role="status" style={{ color: '#1b6e1b' }}>Thank you! Your review was posted.</p>}
      <form onSubmit={submit} noValidate style={{ maxWidth: '480px' }}>
        <div className="field">
          <label htmlFor="review-rating">Rating</label>
          <select
            id="review-rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            aria-invalid={!!fieldErrors.rating}
            aria-describedby={fieldErrors.rating ? 'review-rating-err' : undefined}
          >
            <option value="">Select…</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {'★'.repeat(n)}</option>)}
          </select>
          {fieldErrors.rating && <span id="review-rating-err" className="error">{fieldErrors.rating}</span>}
        </div>
        <div className="field">
          <label htmlFor="review-comment">Comment (optional)</label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-invalid={!!fieldErrors.comment}
            aria-describedby={fieldErrors.comment ? 'review-comment-err' : undefined}
          />
          <span className="hint">{comment.length}/1000</span>
          {fieldErrors.comment && <span id="review-comment-err" className="error">{fieldErrors.comment}</span>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button>
      </form>
    </section>
  );
}
