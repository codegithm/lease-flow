import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  clearLegacyAuthStorage,
  type AppUser,
  persistLegacyAuthSession,
} from "@/lib/auth";
import { ENABLE_BACKGROUND_POLLING, POLLING_INTERVALS } from "@/lib/polling";
import { supabase } from "@/lib/supabase";

const SESSION_CONFIG = {
  TOKEN_CHECK_INTERVAL: POLLING_INTERVALS.sessionCheckMs,
  INACTIVITY_TIMEOUT: 15 * 60 * 1000,
  WARNING_BEFORE_TIMEOUT: 2 * 60 * 1000,
  ACTIVITY_EVENTS: [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click",
  ],
};

interface DecodedToken {
  exp: number;
}

export interface SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpiring: boolean;
  timeUntilExpiry: number;
  lastActivity: number;
  user: AppUser | null;
}

const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/signup",
  "/signup/verify-email",
  "/apply",
  "/about",
  "/terms",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith("/apply"),
  );
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

function getTimeUntilExpiry(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return 0;
  return Math.max(0, decoded.exp * 1000 - Date.now());
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function useSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>({
    isAuthenticated: false,
    isLoading: true,
    isSessionExpiring: false,
    timeUntilExpiry: 0,
    lastActivity: Date.now(),
    user: null,
  });

  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const setSignedOutState = useCallback(() => {
    setSessionState({
      isAuthenticated: false,
      isLoading: false,
      isSessionExpiring: false,
      timeUntilExpiry: 0,
      lastActivity: 0,
      user: null,
    });
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      void supabase.auth.signOut();
      clearLegacyAuthStorage();
      setSignedOutState();

      if (reason) {
        toast.warning(reason);
      }

      if (!isPublicPath(location.pathname)) {
        navigate("/signin", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    },
    [location.pathname, navigate, setSignedOutState],
  );

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      logout("Session expired due to inactivity");
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT);
  }, [logout]);

  const syncStateFromToken = useCallback(
    (token: string | null) => {
      if (!token) {
        setSignedOutState();
        return;
      }

      if (isTokenExpired(token)) {
        logout("Your session has expired. Please sign in again.");
        return;
      }

      const timeUntilExpiry = getTimeUntilExpiry(token);
      const isSessionExpiring =
        timeUntilExpiry <= SESSION_CONFIG.WARNING_BEFORE_TIMEOUT;

      if (isSessionExpiring && !warningShownRef.current) {
        warningShownRef.current = true;
        const minutesLeft = Math.ceil(timeUntilExpiry / 60000);
        toast.warning(
          `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}. Please save your work.`,
          {
            duration: 10000,
            id: "session-warning",
          },
        );
      }

      setSessionState({
        isAuthenticated: true,
        isLoading: false,
        isSessionExpiring,
        timeUntilExpiry,
        lastActivity: lastActivityRef.current,
        user: readStoredUser(),
      });
    },
    [logout, setSignedOutState],
  );

  const checkSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    persistLegacyAuthSession(session);
    syncStateFromToken(session?.access_token || null);
  }, [syncStateFromToken]);

  const extendSession = useCallback(async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }

    updateActivity();
    await checkSession();
    toast.success("Session extended");
  }, [checkSession, updateActivity]);

  useEffect(() => {
    const initialize = async () => {
      await checkSession();

      const token = localStorage.getItem("token");
      if (token && !isTokenExpired(token)) {
        updateActivity();
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      persistLegacyAuthSession(session);
      syncStateFromToken(session?.access_token || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession, syncStateFromToken, updateActivity]);

  useEffect(() => {
    if (!sessionState.isAuthenticated || isPublicPath(location.pathname)) {
      return;
    }

    if (ENABLE_BACKGROUND_POLLING) {
      checkIntervalRef.current = setInterval(() => {
        void checkSession();
      }, SESSION_CONFIG.TOKEN_CHECK_INTERVAL);
    }

    const handleActivity = () => updateActivity();
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [
    checkSession,
    location.pathname,
    sessionState.isAuthenticated,
    updateActivity,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkSession]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "token" && !event.newValue) {
        setSignedOutState();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [setSignedOutState]);

  return {
    ...sessionState,
    logout,
    extendSession,
    updateActivity,
    checkSession,
  };
}

interface SessionContextType extends SessionState {
  logout: (reason?: string) => void;
  extendSession: () => Promise<void>;
  updateActivity: () => void;
  checkSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}
