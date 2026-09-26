import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth0 } from "@auth0/auth0-react";
import { api, setTokenGetter } from "../api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(true);

  /*
   * Give api.js access to the Auth0 access token.
   */
  useEffect(() => {
    setTokenGetter(() => getAccessTokenSilently());
  }, [getAccessTokenSilently]);

  /*
   * Sync Auth0 user with MongoDB.
   */
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setProfile(null);
      setSyncing(false);
      return;
    }

    // Set active session marker immediately upon authentication
    sessionStorage.setItem("interngate_session_active", "true");

    if (!auth0User) {
      return;
    }

    setSyncing(true);

    const preferredRole = localStorage.getItem("preferred_role") || undefined;

    api
      .sync({
        name: auth0User.name || "",
        email: auth0User.email || "",
        role: preferredRole,
      })
      .then(({ user }) => {
        sessionStorage.setItem("interngate_session_active", "true");
        console.log("MongoDB user profile:", user);
        setProfile(user);
        localStorage.removeItem("preferred_role");
      })
      .catch((error) => {
        console.error("Profile sync failed (backend might be offline or misconfigured):", error);
        sessionStorage.setItem("interngate_session_active", "true");
        // Fallback: use Auth0 identity details so user is not stuck in an infinite login loop.
        // Role always defaults to "student" here — the real role comes from MongoDB only.
        setProfile({
          name: auth0User.name || auth0User.nickname || "User",
          email: auth0User.email || "",
          role: "student",
          isOfflineFallback: true,
        });
      })
      .finally(() => {
        setSyncing(false);
      });
  }, [isAuthenticated, isLoading, auth0User]);

  /*
   * Update profile locally after editing profile settings.
   */
  function updateUser(partial) {
    setProfile((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        ...partial,
      };
    });
  }

  /*
   * Auth0 logout.
   */
  function logout() {
    sessionStorage.removeItem("interngate_session_active");
    sessionStorage.clear();
    localStorage.removeItem("preferred_role");
    localStorage.removeItem("pending_login_options");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("@@auth0spajs@@")) {
        localStorage.removeItem(key);
      }
    });
    setProfile(null);

    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

    return Promise.resolve();
  }

  /*
   * Loading continues until Auth0 and MongoDB profile are ready.
   */
  const loading =
    isLoading ||
    (isAuthenticated && syncing);

  /*
   * IMPORTANT:
   * This role comes from MongoDB.
   */
  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        role,
        loading,
        loginWithRedirect,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}