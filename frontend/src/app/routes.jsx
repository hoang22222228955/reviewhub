import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/context/AuthContext';
import { P } from '../shared/lib/privileges';

import PublicLayout from '../public/layout/PublicLayout';
import PartnerLayout from '../partner/layout/PartnerLayout';
import AdminLayout from '../admin/layout/AdminLayout';

import HomePage from '../public/pages/Home/HomePage';
import PricingPage from '../public/pages/Pricing/PricingPage';
import ApiDocsPage from '../public/pages/ApiDocs/ApiDocsPage';
import SystemFlowPage from '../public/pages/SystemFlow/SystemFlowPage';
import ServiceCategoryPage from '../public/pages/ServiceCategory/ServiceCategoryPage';
import ServiceOperatorReviewsPage from '../public/pages/ServiceCategory/ServiceOperatorReviewsPage';

import LoginPage from '../auth/pages/Login/LoginPage';
import RegisterPage from '../auth/pages/Register/RegisterPage';
import ProfilePage from '../auth/pages/Profile/ProfilePage';
import ForgotPasswordPage from '../auth/pages/ForgotPassword/ForgotPasswordPage';

import PartnerDashboardPage from '../partner/pages/Dashboard/PartnerDashboardPage';
import PartnerApiKeysPage from '../partner/pages/ApiKeys/PartnerApiKeysPage';
import PartnerReviewSubmitPage from '../partner/pages/ReviewSubmit/PartnerReviewSubmitPage';
import PartnerReviewQueryPage from '../partner/pages/ReviewQuery/PartnerReviewQueryPage';
import PartnerPrivilegesPage from '../partner/pages/Privileges/PartnerPrivilegesPage';
import PartnerPurchasesPage from '../partner/pages/Purchases/PartnerPurchasesPage';
import PartnerSLAPage from '../partner/pages/SLA/PartnerSLAPage';
import PartnerDomainPage from '../partner/pages/Domain/PartnerDomainPage';

import AdminDashboardPage from '../admin/pages/Dashboard/AdminDashboardPage';
import AdminPlansPage from '../admin/pages/Plans/AdminPlansPage';
import AdminPartnersPage from '../admin/pages/Partners/AdminPartnersPage';
import AdminModerationPage from '../admin/pages/Moderation/AdminModerationPage';
import AdminPurchasesPage from '../admin/pages/Purchases/AdminPurchasesPage';
import AdminBankPage from '../admin/pages/Bank/AdminBankPage';
import AdminSyncReviewPage from '../admin/pages/SyncReview/AdminSyncReviewPage';

function RequireAuth() {
  const { currentUser, loading } = useAuth();

  if (!loading && !currentUser) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (!currentUser) {
    return null;
  }

  return <Outlet />;
}

function RequirePartner() {
  const { currentUser, loading } = useAuth();

  const ok = currentUser?.role === 'partner' || currentUser?.role === 'admin';

  if (!loading && !ok) {
    return <Navigate to="/tai-khoan" replace />;
  }

  if (!currentUser) {
    return null;
  }

  return <Outlet />;
}

function RequireAdmin() {
  const { currentUser, loading } = useAuth();

  if (!loading && currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!currentUser) {
    return null;
  }

  return <Outlet />;
}

function RequirePrivilege({ privilegeKey }) {
  const { hasPrivilege, currentUser, loading } = useAuth();

  if (!loading && !currentUser) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (!currentUser) {
    return null;
  }

  if (!loading && !hasPrivilege(privilegeKey)) {
    return <Navigate to="/doi-tac" replace state={{ blocked: privilegeKey }} />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="dich-vu/:slug" element={<ServiceCategoryPage />} />

        <Route
          path="dich-vu/:slug/reviews/:operatorCode"
          element={<ServiceOperatorReviewsPage />}
        />

        <Route path="bang-gia" element={<PricingPage />} />
        <Route path="tai-lieu-api" element={<ApiDocsPage />} />
        <Route path="luong-he-thong" element={<SystemFlowPage />} />
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="quen-mat-khau" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PublicLayout compact />}>
          <Route path="tai-khoan" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequirePartner />}>
        <Route path="doi-tac" element={<PartnerLayout />}>
          <Route index element={<PartnerDashboardPage />} />
          <Route path="khoa-api" element={<PartnerApiKeysPage />} />

          <Route element={<RequirePrivilege privilegeKey={P.WRITE_REVIEW} />}>
            <Route path="gui-review" element={<PartnerReviewSubmitPage />} />
          </Route>

          <Route path="lay-review" element={<PartnerReviewQueryPage />} />

          <Route element={<RequirePrivilege privilegeKey={P.SLA} />}>
            <Route path="theo-doi-sla" element={<PartnerSLAPage />} />
          </Route>

          <Route element={<RequirePrivilege privilegeKey={P.DOMAIN_EXPAND} />}>
            <Route path="domain" element={<PartnerDomainPage />} />
          </Route>

          <Route path="dac-quyen" element={<PartnerPrivilegesPage />} />
          <Route path="lich-su-mua" element={<PartnerPurchasesPage />} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="quan-tri" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="goi-dich-vu" element={<AdminPlansPage />} />
          <Route path="doi-tac" element={<AdminPartnersPage />} />
          <Route path="mua-goi" element={<AdminPurchasesPage />} />
          <Route path="kiem-duyet" element={<AdminModerationPage />} />

          {/* Trang crawl Google Maps */}
          <Route path="lay-review-google-maps" element={<AdminSyncReviewPage />} />

          <Route path="ngan-hang" element={<AdminBankPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}