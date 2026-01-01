// client/src/App.jsx

import "./index.css";
import Header from "./components/Header";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/RequireAuth";
import MainPage from "./components/main/MainPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <main className="min-h-screen bg-gray-50">
          <Routes>
            {/* Login page (no header, no padding) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected main app (with header + content layout) */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <>
                    <Header />
                    <div className="max-w-[70rem] mx-auto">
                       <MainPage />
                    </div>
                  </>
                </RequireAuth>
              }
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
