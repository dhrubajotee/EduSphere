// client/src/pages/LoginPage.jsx

import LoginLeft from "../components/login/LoginLeft";
import LoginRight from "../components/login/LoginRight";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8f6ff] via-[#faf8ff] to-white"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent_40%)]"></div>

      {/* login card container */}
      <div className="relative z-10 w-full flex justify-center">
        <div className="w-[92%] max-w-[1450px] h-[90vh] grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl bg-white/60 backdrop-blur-lg border border-gray-200/50">
          <LoginLeft />
          <LoginRight />
        </div>
      </div>
    </div>
  );
}
