// client/src/components/RequireAuth.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login and remember the page user tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
