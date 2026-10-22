import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Catalogue from './pages/Catalogue';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import Cart from './pages/Cart';
import { ForgotPassword, ResetPassword } from './pages/ForgotPassword';

export default function App() {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <div id="main">
        <Routes>
          <Route path="/" element={<Catalogue />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<main className="page"><h1>Page not found</h1></main>} />
        </Routes>
      </div>
    </>
  );
}
