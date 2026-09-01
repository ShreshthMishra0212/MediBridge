import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to respective dashboard if role is incorrect
    return <Navigate to={user?.role === "doctor" ? "/doctor" : "/patient"} replace />;
  }

  return <Outlet />;
};
