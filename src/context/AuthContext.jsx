import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("medibridge_token"));
  const [user, setUser] = useState(() => {
    const cachedUser = localStorage.getItem("medibridge_user");
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listener for interceptor 401 events
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("medibridge_unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("medibridge_unauthorized", handleUnauthorized);
    };
  }, []);

  const login = (data) => {
    localStorage.setItem("medibridge_token", data.token);
    localStorage.setItem("medibridge_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("medibridge_token");
    localStorage.removeItem("medibridge_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
