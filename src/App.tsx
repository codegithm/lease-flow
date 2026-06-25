import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { SessionProvider } from "@/hooks/use-session";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Units from "./pages/Units";
import UnitDetail from "./pages/UnitDetail";
import EditUnit from "./pages/EditUnit";
import Applications from "./pages/Applications";
import ApplicationDetail from "./pages/ApplicationDetail";
import Leases from "./pages/Leases";
import LeaseSigning from "./pages/LeaseSigning";
import Payments from "./pages/Payments";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Configurations from "./pages/Configurations";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ClientRegistration from "./pages/ClientRegistration";
import TenantPortal from "./pages/TenantPortal";
import CompanyUsers from "./pages/CompanyUsers";
import TermsAndConditions from "./pages/TermsAndConditions";
import Messages from "./pages/Messages";
import CreditCheckReport from "./pages/CreditCheckReport";
import InvoiceStatement from "./pages/InvoiceStatement";
import BulkMigration from "./pages/BulkMigration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SessionProvider>
          <AuthGuard>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/units" element={<Units />} />
              <Route path="/units/:id" element={<UnitDetail />} />
              <Route path="/units/:id/edit" element={<EditUnit />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetail />} />
              <Route
                path="/applications/:id/credit-report"
                element={<CreditCheckReport />}
              />
              <Route path="/leases" element={<Leases />} />
              <Route path="/lease-signing/:id" element={<LeaseSigning />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/configurations" element={<Configurations />} />
              <Route path="/team" element={<CompanyUsers />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signup/verify-email" element={<VerifyEmail />} />
              <Route path="/about" element={<About />} />
              {/* Client/Tenant routes */}
              <Route path="/apply" element={<ClientRegistration />} />
              <Route path="/tenant-portal/:id" element={<TenantPortal />} />
              <Route
                path="/invoice/:applicationId"
                element={<InvoiceStatement />}
              />
              <Route path="/bulk-migration" element={<BulkMigration />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </SessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
