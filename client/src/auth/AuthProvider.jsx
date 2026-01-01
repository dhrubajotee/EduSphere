// client/src/auth/AuthProvider.jsx

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
} from "../api/tokenStore";
import Swal from "sweetalert2";


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore user and token from localStorage on page reload
  useEffect(() => {
    const token = getAccessToken();
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);

      const res = await api.post("/users/login", { username, password });
      const { access_token, user } = res.data;

      // Save both token and user info locally
      setAccessToken(access_token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
      alert(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, full_name, email, password) => {
    try {
      setLoading(true);

      const res = await api.post("/users", {
        username,
        full_name,
        email,
        password,
      });

      const { access_token, user } = res.data;

      if (access_token) {
        setAccessToken(access_token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        navigate("/");
      } else {
        await Swal.fire({
          icon: "success",
          title: "Registration Successful!",
          text: "Please log in to continue.",
          confirmButtonColor: "#3085d6",
        });
        navigate("/login");
      }
    } catch (err) {
      console.error("Registration failed:", err);
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err.response?.data?.error || "Something went wrong!",
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };


  const logout = () => {
    clearAccessToken();
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
