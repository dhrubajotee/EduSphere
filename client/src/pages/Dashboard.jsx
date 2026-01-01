// client/src/pages/Dashboard.jsx

import React from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <h1 className="text-3xl font-semibold mb-4">Welcome 👋</h1>

        {user ? (
          <>
            <p className="text-gray-600 mb-2">
              Logged in as <span className="font-medium text-gray-900">{user.name || user.email}</span>
            </p>
            {user.email && <p className="text-gray-500 mb-6">{user.email}</p>}

            <button
              onClick={logout}
              className="w-full py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition"
            >
              Log out
            </button>
          </>
        ) : (
          <p className="text-gray-600">Loading user info...</p>
        )}
      </div>
    </div>
  );
}
