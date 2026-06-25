import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RoleHelper } from "@/lib/roles";
import { useSessionContext } from "@/hooks/use-session";

// Routes that require authentication
const AUTH_REQUIRED_ROUTES = [
  "/dashboard",
  "/units",
  "/applications",
  "/leases",
  "/payments",
  "/notifications",
  "/settings",
  "/team",
  "/tenant-portal",
];

// Routes only for privileged roles (not tenants)
const AGENT_ONLY_ROUTES = ["/dashboard", "/units", "/applications", "/team"];

// Routes only for tenants
const TENANT_ROUTES = ["/tenant-portal"];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSessionContext();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Check if current path requires auth
      const requiresAuth = AUTH_REQUIRED_ROUTES.some((route) =>
        location.pathname.startsWith(route),
      );

      if (!requiresAuth) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      if (isLoading) {
        setIsChecking(true);
        return;
      }

      if (!isAuthenticated || !user) {
        // Not logged in - redirect to signin
        navigate("/signin", {
          replace: true,
          state: { from: location.pathname },
        });
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      const role = (user.role || "").toLowerCase();
      const userId = user.id;
      const status = (user.status || "active").toLowerCase();

      if (status === "blocked") {
        navigate("/signin", { replace: true });
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      const isAgentRoute = AGENT_ONLY_ROUTES.some((route) =>
        location.pathname.startsWith(route),
      );

      if (isAgentRoute && RoleHelper.isTenant(role)) {
        if (userId) {
          navigate(`/tenant-portal/${userId}`, { replace: true });
        } else {
          navigate("/signin", { replace: true });
        }
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      const isTenantRoute = TENANT_ROUTES.some((route) =>
        location.pathname.startsWith(route),
      );

      if (isTenantRoute && RoleHelper.isStaff(role)) {
        // Staff can still inspect a specific tenant portal when needed.
      }

      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, isLoading, location.pathname, navigate, user]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking Supabase session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
