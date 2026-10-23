import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Catalogue from './pages/Catalogue';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import { ForgotPassword, ResetPassword } from './pages/ForgotPassword';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import OrderDetail from './pages/OrderDetail';

export default function App() {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <div id="main">
        <Routes>
          <Route path="/" element={<Catalogue />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
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
