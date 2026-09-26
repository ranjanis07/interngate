import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  requiredRole,
}) {
  const {
    isLoading: auth0Loading,
    isAuthenticated,
  } = useAuth0();

  const {
    user,
    loading,
    role,
  } = useAuth();

  const isSessionActive = sessionStorage.getItem("interngate_session_active") === "true";
  const isCallback = window.location.search.includes("code=") && window.location.search.includes("state=");

  /*
   * 1. Wait for Auth0 and MongoDB profile while syncing.
   * ALWAYS wait for auth0Loading / loading before deciding whether to redirect!
   */
  if (auth0Loading || loading) {
    return (
      <div className="auth-page">
        <div className="auth-form" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="loading-spinner"></div>
          <h2>Loading InternGate...</h2>
          <p className="sub">Checking your session...</p>
        </div>
      </div>
    );
  }

  /*
   * 2. If user closed the website without logging out and reopened, sessionStorage is empty.
   * Redirect immediately to /login unless we are actively processing a fresh OAuth callback.
   */
  if (!isSessionActive && !isCallback) {
    return <Navigate to="/login" replace />;
  }

  /*
   * Not logged in or no profile.
   */
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  /*
   * Admin-only page.
   */
  if (requiredRole === "admin") {
    if (role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  /*
   * Faculty-only page.
   */
  if (requiredRole === "faculty") {
    if (role !== "faculty" && role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  /*
   * If an admin or faculty tries to open default student route, redirect to their role dashboard
   */
  if (!requiredRole) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "faculty") return <Navigate to="/faculty" replace />;
  }

  return children;
}