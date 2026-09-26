import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { user, role, loading } = useAuth();
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");

  useEffect(() => {
    if (!loading && user) {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "faculty") {
        navigate("/faculty", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  function handleRegister(options = {}) {
    localStorage.setItem("preferred_role", selectedRole);
    loginWithRedirect(options);
  }

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ textAlign: "center" }}>
        <h2>Create account</h2>
        <p className="sub">Sign up to submit or evaluate internship requests.</p>

        <div style={{ marginBottom: "16px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "var(--slate)", display: "block", marginBottom: "6px" }}>
            Account Type:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ width: "100%", padding: "9px 11px", borderRadius: "8px", border: "1px solid var(--border)" }}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty Member</option>
          </select>
        </div>

        <button
          type="button"
          className="google-btn"
          onClick={() =>
            handleRegister({
              authorizationParams: { connection: "google-oauth2" },
            })
          }
        >
          Continue with Google
        </button>

        <div className="divider">or</div>

        <button
          type="button"
          onClick={() => handleRegister({ authorizationParams: { screen_hint: "signup" } })}
        >
          Sign up with email
        </button>
      </div>
    </div>
  );
}