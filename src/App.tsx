import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Pages
import HomePage from '@/pages/HomePage';
import NotesPage from '@/pages/NotesPage';
import NoteDetailPage from '@/pages/NoteDetailPage';
import CategoriesPage from '@/pages/CategoriesPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderStatusPage from '@/pages/OrderStatusPage';
import MyOrdersPage from '@/pages/MyOrdersPage';
import MyNotesPage from '@/pages/MyNotesPage';
import PdfViewerPage from '@/pages/PdfViewerPage';
import AboutPage from '@/pages/AboutPage';
import FAQPage from '@/pages/FAQPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes with layout */}
          <Route element={<Layout><HomePage /></Layout>} path="/" />
          <Route element={<Layout><NotesPage /></Layout>} path="/notes" />
          <Route element={<Layout><NoteDetailPage /></Layout>} path="/notes/:slug" />
          <Route element={<Layout><CategoriesPage /></Layout>} path="/categories" />
          <Route element={<Layout><AboutPage /></Layout>} path="/about" />
          <Route element={<Layout><FAQPage /></Layout>} path="/faq" />
          <Route element={<Layout><PrivacyPage /></Layout>} path="/privacy" />
          <Route element={<Layout><TermsPage /></Layout>} path="/terms" />

          {/* Auth pages — no layout (full-screen design) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected: user dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected: Checkout */}
          <Route
            path="/checkout/:productId"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          {/* Protected: Order status */}
          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute>
                <OrderStatusPage />
              </ProtectedRoute>
            }
          />

          {/* Protected: My orders list */}
          <Route
            path="/dashboard/orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyOrdersPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected: My purchased notes */}
          <Route
            path="/my-notes"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyNotesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected: PDF viewer (full-screen, no layout) */}
          <Route
            path="/my-notes/:productId/view"
            element={
              <ProtectedRoute>
                <PdfViewerPage />
              </ProtectedRoute>
            }
          />

          {/* Protected: admin only */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
