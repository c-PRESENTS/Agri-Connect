import { lazy } from "react";
import { Route, Switch } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { StudentAccessRoute } from "@/components/student-access-route";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const AboutPage = lazy(() => import("@/pages/about"));
const LogisticsPage = lazy(() => import("@/pages/logistics"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PhotoSell = lazy(() => import("@/pages/photo-sell"));
const ProductListingPage = lazy(() => import("@/pages/product-listing"));
const CartPage = lazy(() => import("@/pages/cart"));
const GovernmentSchemes = lazy(() => import("@/pages/government-schemes"));
const FarmersHelp = lazy(() => import("@/pages/farmers-help"));
const LandLeasingPage = lazy(() => import("@/pages/land-leasing"));
const ShipPage = lazy(() => import("@/pages/ship"));
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
const OrderConfirmationPage = lazy(() => import("@/pages/order-confirmation"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const OrderDetailPage = lazy(() => import("@/pages/order-detail"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentCancelledPage = lazy(() => import("@/pages/payment-cancelled"));
const SupportPage = lazy(() => import("@/pages/support"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service"));
const RefundPolicyPage = lazy(() => import("@/pages/refund-policy"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const MyProfilePage = lazy(() => import("@/pages/my-profile"));
const ProfileCompletionPage = lazy(() => import("@/pages/profile-completion"));
const StudentHelpPointPage = lazy(() => import("@/pages/student-help-point"));
const StudentLoginPage = lazy(() => import("@/pages/student-login"));
const StudentVerifyEmailPage = lazy(() => import("@/pages/student-verify-email"));
const StudentConfirmLoginPage = lazy(() => import("@/pages/student-confirm-login"));
const FulfillmentPage = lazy(() => import("@/pages/fulfillment"));
const OperatorDashboardPage = lazy(() => import("@/pages/operator-dashboard"));

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
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
      <Route path="/farmers-help" component={FarmersHelp} />
      <Route path="/land-leasing" component={LandLeasingPage} />
      <Route path="/logistics" component={LogisticsPage} />
      <Route path="/ship/track/:trackingId" component={ShipTrackPage} />
      <Route path="/ship" component={ShipPage} />
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
        <ProtectedRoute><OperatorDashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/sellers/:id" component={SellerProfilePage} />
      <Route path="/map" component={SmartMapPage} />
      <Route path="/checkout">
        <ProtectedRoute><CheckoutPage /></ProtectedRoute>
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
      <Route path="/support" component={SupportPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
