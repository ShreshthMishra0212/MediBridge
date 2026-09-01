import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  User,
  Calendar,
  FileText,
  ClipboardList,
  BrainCircuit,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { AiHealthBot } from "../components/AiHealthBot";

export const DoctorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/doctor", icon: <LayoutDashboard size={19} /> },
    { name: "Today's Schedule", path: "/doctor/appointments", icon: <Calendar size={19} /> },
    { name: "Pending Requests", path: "/doctor/requests", icon: <ClipboardList size={19} /> },
    { name: "AI Medical Briefer", path: "/doctor/ai-briefer", icon: <BrainCircuit size={19} /> },
    { name: "Prescriptions Archive", path: "/doctor/prescriptions", icon: <FileText size={19} /> },
    { name: "Clinical Profile", path: "/doctor/profile", icon: <User size={19} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar" style={{ backgroundColor: "hsl(220, 35%, 11%)" }}>
        <div className="sidebar-logo">
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px" }}>
            🩺
          </div>
          <span className="logo-text">MediBridge Dr.</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
          >
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>MediBridge Clinical Studio</h1>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Attending Physician: <strong>Dr. {user?.name || "Doctor"}</strong>
            </p>
          </div>
          <div className="user-profile-badge">
            <span className="avatar" style={{ backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>
              {user?.name ? user.name[0].toUpperCase() : "D"}
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Dr. {user?.name}</span>
            <span className="badge badge-pending" style={{ fontSize: "0.7rem", backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>
              Consultant
            </span>
          </div>
        </header>

        <Outlet />

        {/* Global Floating AI Health Assistant */}
        <AiHealthBot />
      </main>
    </div>
  );
};
