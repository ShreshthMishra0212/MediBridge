import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/services";
import { Sparkles, User, Stethoscope } from "lucide-react";

export const LoginRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("patient"); // 'patient' or 'doctor'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password || (!isLogin && !name)) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const response = await authApi.login(email, password);
        login(response);
        if (response.user.role === "doctor") {
          navigate("/doctor");
        } else {
          navigate("/patient");
        }
      } else {
        await authApi.register(name, email, password, role);
        setSuccess("Registration successful! You can now sign in.");
        setIsLogin(true);
        setName("");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
        "Authentication failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authApi.login(demoEmail, demoPassword);
      login(response);
      if (response.user.role === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/patient");
      }
    } catch (err) {
      console.error(err);
      setError("Demo login failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ fontSize: "2.2rem" }}>🩺</span>
          </div>
          <h2 style={{ margin: "4px 0 2px" }}>MediBridge</h2>
          <p className="text-muted" style={{ fontSize: "0.88rem" }}>AI Medicine Intelligence & Telehealth Ecosystem</p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "var(--primary-light)", borderRadius: "10px", border: "1px dashed hsla(var(--hue), 85%, 55%, 0.3)" }}>
          <small style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
            <Sparkles size={13} /> 1-Click Quick Demo Sign In:
          </small>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: "8px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#ffffff" }}
              onClick={() => handleDemoLogin("rahul@gmail.com", "mypassword123")}
              disabled={loading}
            >
              <User size={13} className="text-primary" />
              <span>Demo Patient</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: "8px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#ffffff" }}
              onClick={() => handleDemoLogin("rahuldoctor@gmail.com", "mypassword123")}
              disabled={loading}
            >
              <Stethoscope size={13} className="text-secondary" />
              <span>Demo Doctor</span>
            </button>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(true);
              setError("");
              setSuccess("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(false);
              setError("");
              setSuccess("");
            }}
          >
            Register Account
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Register As Role</label>
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="patient">Patient Profile</option>
                  <option value="doctor">Doctor Profile</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
