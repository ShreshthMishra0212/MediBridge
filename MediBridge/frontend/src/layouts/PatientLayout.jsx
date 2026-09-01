import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  User,
  Calendar,
  FileText,
  ScanLine,
  BrainCircuit,
  LogOut,
  FolderOpen,
  Stethoscope,
  Heart,
} from "lucide-react";
import { AiHealthBot } from "../components/AiHealthBot";

export const PatientLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/patient", icon: <LayoutDashboard size={19} /> },
    { name: "Appointments", path: "/patient/appointments", icon: <Calendar size={19} /> },
    { name: "Find a Doctor", path: "/patient/doctors", icon: <Stethoscope size={19} /> },
    { name: "OCR Salt Scanner", path: "/patient/ocr", icon: <ScanLine size={19} /> },
    { name: "AI Health Brief", path: "/patient/ai-brief", icon: <BrainCircuit size={19} /> },
    { name: "My Prescriptions", path: "/patient/prescriptions", icon: <FileText size={19} /> },
    { name: "Medical Records", path: "/patient/records", icon: <FolderOpen size={19} /> },
    { name: "My Profile", path: "/patient/profile", icon: <User size={19} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px" }}>
            🩺
          </div>
          <span className="logo-text">MediBridge</span>
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
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>MediBridge Patient Hub</h1>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Welcome back, <strong>{user?.name || "Patient"}</strong>
            </p>
          </div>
          <div className="user-profile-badge">
            <span className="avatar">{user?.name ? user.name[0].toUpperCase() : "P"}</span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{user?.name}</span>
            <span className="badge badge-confirmed" style={{ fontSize: "0.7rem" }}>Patient</span>
          </div>
        </header>

        <Outlet />

        {/* Global Floating AI Health Assistant */}
        <AiHealthBot />
      </main>
    </div>
  );
};
