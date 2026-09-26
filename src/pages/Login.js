import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, role, loading } = useAuth();
  const { loginWithRedirect, isLoading: auth0Loading } = useAuth0();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");

  const isSessionActive = sessionStorage.getItem("interngate_session_active") === "true";
  const isCallback = window.location.search.includes("code=") && window.location.search.includes("state=");

  // Pre-warm the Render backend so it is awake by the time the user finishes Auth0 authentication
  useEffect(() => {
    fetch("https://interngate.onrender.com/api/health").catch(() => {});
  }, []);

  // ── Redirect authenticated users with active session to their dashboard ────
  useEffect(() => {
    if (!loading && user && isSessionActive) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "faculty") navigate("/faculty", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [user, role, loading, isSessionActive, navigate]);

  function handleLogin(options = {}) {
    // Remember role for new user registration sync
    if (selectedRole === "faculty") {
      localStorage.setItem("preferred_role", "faculty");
    } else {
      localStorage.removeItem("preferred_role");
    }

    loginWithRedirect({
      ...options,
      authorizationParams: {
        ...(options.authorizationParams || {}),
        prompt: "login",
      },
    });
  }

  // Only show the signing-in spinner if we are actively processing an incoming login callback or active session syncing
  if (isCallback || (isSessionActive && (loading || auth0Loading))) {
    return (
      <div className="auth-page">
        <div className="auth-form" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="loading-spinner"></div>
          <h2>Signing in to InternGate...</h2>
          <p className="sub">Taking you to your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ textAlign: "center" }}>
        <h2>Welcome back</h2>
        <p className="sub">Sign in to submit or review internship requests.</p>

        <div style={{ marginBottom: "16px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "var(--slate)", display: "block", marginBottom: "6px" }}>
            I am signing in as:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ width: "100%", padding: "9px 11px", borderRadius: "8px", border: "1px solid var(--border)" }}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>

        <button
          type="button"
          className="google-btn"
          onClick={() => handleLogin({ authorizationParams: { connection: "google-oauth2" } })}
        >
          Continue with Google
        </button>

        <div className="divider">or</div>

        <button
          type="button"
          onClick={() => handleLogin({ authorizationParams: { screen_hint: "login" } })}
        >
          Log in with email
        </button>
      </div>
    </div>
  );
}