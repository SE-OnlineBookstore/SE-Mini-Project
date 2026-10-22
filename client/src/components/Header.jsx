import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Persistent header with search, account menu (SRS 3.1).
export default function Header() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <header className="header">
      <Link to="/" className="brand">Online Bookstore</Link>
      <form onSubmit={submit} role="search" className="search">
        <label htmlFor="q" className="sr-only">Search books</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, author, ISBN or publisher" />
        <button type="submit">Search</button>
      </form>
      <nav>
        {user ? (
          <>
            {user.role === 'BUYER' && <Link to="/cart">Cart</Link>}
            <span className="muted">{user.name} ({user.role.toLowerCase()})</span>
            <button type="button" className="link" onClick={logout}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
