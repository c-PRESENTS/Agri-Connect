import { lazy } from "react";
import { Redirect, Route, Switch } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { StudentAccessRoute } from "@/components/student-access-route";
import { AdminAccessRoute } from "@/components/admin-access-route";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const CategoriesPage = lazy(() => import("@/pages/categories"));
const AboutPage = lazy(() => import("@/pages/about"));
const LogisticsPage = lazy(() => import("@/pages/logistics"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PhotoSell = lazy(() => import("@/pages/photo-sell"));
const ProductListingPage = lazy(() => import("@/pages/product-listing"));
const CartPage = lazy(() => import("@/pages/cart"));
const GovernmentSchemes = lazy(() => import("@/pages/government-schemes"));
const FarmersHelp = lazy(() => import("@/pages/farmers-help"));
const LandLeasingPage = lazy(() => import("@/pages/land-leasing"));
const ShipTrackPage = lazy(() => import("@/pages/ship-track"));
const ShareCarePage = lazy(() => import("@/pages/share-care"));
const LoginPage = lazy(() => import("@/pages/login"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AgriTechPage = lazy(() => import("@/pages/agritech"));
const SellerPage = lazy(() => import("@/pages/seller"));
const SellerProfilePage = lazy(() => import("@/pages/seller-profile"));
const ProductDetailPage = lazy(() => import("@/pages/product-detail"));
const ComparePage = lazy(() => import("@/pages/compare"));
const SmartMapPage = lazy(() => import("@/pages/smart-map"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const CheckoutPaymentPage = lazy(() => import("@/pages/checkout-payment"));
const OrderConfirmationPage = lazy(() => import("@/pages/order-confirmation"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const OrderDetailPage = lazy(() => import("@/pages/order-detail"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentCancelledPage = lazy(() => import("@/pages/payment-cancelled"));
const PaymentProcessingPage = lazy(() => import("@/pages/payment-processing"));
const PaymentFailedPage = lazy(() => import("@/pages/payment-failed"));
const PaymentRetryPage = lazy(() => import("@/pages/payment-retry"));
const SupportPage = lazy(() => import("@/pages/support"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service"));
const RefundPolicyPage = lazy(() => import("@/pages/refund-policy"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const MyProfilePage = lazy(() => import("@/pages/my-profile"));
const MySitesPage = lazy(() => import("@/pages/my-sites"));
const ProfileCompletionPage = lazy(() => import("@/pages/profile-completion"));
const StudentHelpPointPage = lazy(() => import("@/pages/student-help-point"));
const StudentLoginPage = lazy(() => import("@/pages/student-login"));
const StudentVerifyEmailPage = lazy(() => import("@/pages/student-verify-email"));
const StudentConfirmLoginPage = lazy(() => import("@/pages/student-confirm-login"));
const FulfillmentPage = lazy(() => import("@/pages/fulfillment"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const RegionalOrganisationPage = lazy(() => import("@/pages/regional-organisation"));
const AdminOverviewPage = lazy(() => import("@/pages/admin-overview"));
const AdminAuditPage = lazy(() => import("@/pages/admin-audit"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminUserDetailPage = lazy(() => import("@/pages/admin-user-detail"));
const AdminVerificationsPage = lazy(() => import("@/pages/admin-verifications"));
const AdminVerificationDetailPage = lazy(() => import("@/pages/admin-verification-detail"));
const AdminProductsPage = lazy(() => import("@/pages/admin-products"));
const AdminProductDetailPage = lazy(() => import("@/pages/admin-product-detail"));
const AdminCategoriesPage = lazy(() => import("@/pages/admin-categories"));
const AdminEmployeesPage = lazy(() => import("@/pages/admin-employees"));
const AdminEmployeeDetailPage = lazy(() => import("@/pages/admin-employee-detail"));
const AdminRolesPage = lazy(() => import("@/pages/admin-roles"));
const AdminSecurityPage = lazy(() => import("@/pages/admin-security"));
const AcceptInvitationPage = lazy(() => import("@/pages/accept-invitation"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const VerifyEmailPage = lazy(() => import("@/pages/verify-email"));
const AdminSignInPage = lazy(() => import("@/pages/admin-sign-in"));

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/marketplace" component={SmartMapPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/accept-invitation" component={AcceptInvitationPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/admin/sign-in" component={AdminSignInPage} />
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/photo-sell">
        <ProtectedRoute><PhotoSell /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/list-product">
        <ProtectedRoute><ProductListingPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/schemes">
        <ProtectedRoute><GovernmentSchemes /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      </Route>
      <Route path="/favorites">
        <ProtectedRoute><FavoritesPage /></ProtectedRoute>
      </Route>
      <Route path="/my-profile">
        <ProtectedRoute><MyProfilePage /></ProtectedRoute>
      </Route>
      <Route path="/my-sites" component={MySitesPage} />
      <Route path="/sites"><Redirect to="/my-sites" /></Route>
      <Route path="/dietary"><Redirect to="/?category=dietary" /></Route>
      <Route path="/profile-completion">
        <ProtectedRoute><ProfileCompletionPage /></ProtectedRoute>
      </Route>
      <Route path="/student-help-point">
        <StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute>
      </Route>
      <Route path="/student/login" component={StudentLoginPage} />
      <Route path="/student/verify-email" component={StudentVerifyEmailPage} />
      <Route path="/student/confirm-login" component={StudentConfirmLoginPage} />
      <Route path="/student/dashboard"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/student/resources"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/student/support"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/student/requests"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/farmers-help/student"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/farmers-help/student/resources"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/farmers-help/student/support"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/farmers-help/student/requests"><StudentAccessRoute><StudentHelpPointPage /></StudentAccessRoute></Route>
      <Route path="/farmers-help" component={FarmersHelp} />
      <Route path="/land-leasing" component={LandLeasingPage} />
      <Route path="/logistics" component={LogisticsPage} />
      <Route path="/logistics-collaboration" component={LogisticsPage} />
      <Route path="/ship/track/:trackingId" component={ShipTrackPage} />
      <Route path="/ship" component={LogisticsPage} />
      <Route path="/share-care" component={ShareCarePage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/agritech" component={AgriTechPage} />
      <Route path="/government-schemes" component={GovernmentSchemes} />
      <Route path="/products/:id" component={ProductDetailPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/seller">
        <ProtectedRoute><SellerPage /></ProtectedRoute>
      </Route>
      <Route path="/fulfillment">
        <ProtectedRoute><FulfillmentPage /></ProtectedRoute>
      </Route>
      <Route path="/operator">
        <AdminAccessRoute permission="dashboard.view"><Redirect to="/admin/overview" /></AdminAccessRoute>
      </Route>
      <Route path="/admin">
        <AdminAccessRoute permission="dashboard.view"><Redirect to="/admin/overview" /></AdminAccessRoute>
      </Route>
      <Route path="/admin/overview">
        <AdminAccessRoute permission="dashboard.view"><AdminOverviewPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/audit">
        <AdminAccessRoute permission="audit.view"><AdminAuditPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/users/:userId">
        <AdminAccessRoute permission="users.view"><AdminUserDetailPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/users">
        <AdminAccessRoute permission="users.view"><AdminUsersPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/verifications/:caseId">
        <AdminAccessRoute permission="verification.view"><AdminVerificationDetailPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/verifications">
        <AdminAccessRoute permission="verification.view"><AdminVerificationsPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/products/:productId">
        <AdminAccessRoute permission="products.view"><AdminProductDetailPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/products">
        <AdminAccessRoute permission="products.view"><AdminProductsPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/categories">
        <AdminAccessRoute permission="categories.view"><AdminCategoriesPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/employees/:membershipId">
        <AdminAccessRoute permission="employees.view"><AdminEmployeeDetailPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/employees">
        <AdminAccessRoute permission="employees.view"><AdminEmployeesPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/roles">
        <AdminAccessRoute permission="employees.view"><AdminRolesPage /></AdminAccessRoute>
      </Route>
      <Route path="/admin/security">
        <AdminAccessRoute permission="security.manage"><AdminSecurityPage /></AdminAccessRoute>
      </Route>
      <Route path="/regional-organisation">
        <ProtectedRoute><RegionalOrganisationPage /></ProtectedRoute>
      </Route>
      <Route path="/sellers/:id" component={SellerProfilePage} />
      <Route path="/sellers" component={SellerPage} />
      <Route path="/map" component={SmartMapPage} />
      <Route path="/checkout">
        <ProtectedRoute><CheckoutPage /></ProtectedRoute>
      </Route>
      <Route path="/checkout/payment/:quoteId">
        <ProtectedRoute><CheckoutPaymentPage /></ProtectedRoute>
      </Route>
      <Route path="/order-confirmation/:id">
        <ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute><OrdersPage /></ProtectedRoute>
      </Route>
      <Route path="/orders/:id">
        <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/success">
        <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/cancelled" component={PaymentCancelledPage} />
      <Route path="/payment/:attemptId/processing">
        <ProtectedRoute><PaymentProcessingPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/:attemptId/success">
        <ProtectedRoute><PaymentProcessingPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/:attemptId/failed">
        <ProtectedRoute><PaymentFailedPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/:attemptId/cancelled">
        <ProtectedRoute><PaymentFailedPage /></ProtectedRoute>
      </Route>
      <Route path="/payment/:attemptId/retry">
        <ProtectedRoute><PaymentRetryPage /></ProtectedRoute>
      </Route>
      <Route path="/support" component={SupportPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
