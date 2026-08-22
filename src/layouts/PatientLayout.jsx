import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  User, 
  Calendar, 
  FileText, 
  Upload, 
  ScanLine, 
  BrainCircuit, 
  LogOut 
} from "lucide-react";

export const PatientLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/patient", icon: <LayoutDashboard size={20} /> },
    { name: "My Appointments", path: "/patient/appointments", icon: <Calendar size={20} /> },
    { name: "Find a Doctor", path: "/patient/doctors", icon: <User size={20} /> },
    { name: "Medical Records", path: "/patient/records", icon: <FileText size={20} /> },
    { name: "OCR scanner", path: "/patient/ocr", icon: <ScanLine size={20} /> },
    { name: "AI Health brief", path: "/patient/ai-brief", icon: <BrainCircuit size={20} /> },
    { name: "My Prescriptions", path: "/patient/prescriptions", icon: <Upload size={20} /> },
    { name: "My Profile", path: "/patient/profile", icon: <User size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>💊</span>
          <span>MediBridge</span>
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
          <button onClick={handleLogout} className="sidebar-item" style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>MediBridge Patient Hub</h1>
            <p className="text-muted">Welcome back, {user?.name}</p>
          </div>
          <div className="user-profile-badge">
            <span className="avatar">{user?.name ? user.name[0].toUpperCase() : "P"}</span>
            <span style={{ fontWeight: 600 }}>{user?.name}</span>
            <span className="badge badge-confirmed" style={{ fontSize: "0.7rem" }}>Patient</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
