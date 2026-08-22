import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  User, 
  Calendar, 
  FileText, 
  ClipboardList, 
  LogOut 
} from "lucide-react";

export const DoctorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/doctor", icon: <LayoutDashboard size={20} /> },
    { name: "Today's Schedule", path: "/doctor/appointments", icon: <Calendar size={20} /> },
    { name: "Appointment Requests", path: "/doctor/requests", icon: <ClipboardList size={20} /> },
    { name: "Prescriptions History", path: "/doctor/prescriptions", icon: <FileText size={20} /> },
    { name: "My Profile", path: "/doctor/profile", icon: <User size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar" style={{ backgroundColor: "hsl(220, 35%, 11%)" }}>
        <div className="sidebar-logo">
          <span>🩺</span>
          <span>MediBridge Dr.</span>
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
            <h1>MediBridge Clinical Hub</h1>
            <p className="text-muted">Welcome, {user?.name}</p>
          </div>
          <div className="user-profile-badge">
            <span className="avatar" style={{ backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>
              {user?.name ? user.name[0].toUpperCase() : "D"}
            </span>
            <span style={{ fontWeight: 600 }}>{user?.name}</span>
            <span className="badge badge-pending" style={{ fontSize: "0.7rem", backgroundColor: "var(--secondary-light)", color: "var(--secondary)" }}>Doctor</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
