// client/src/components/Header.jsx

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { LogOut, HelpCircle, ChevronDown, User, BookOpen } from 'lucide-react';

export default function Header() {

  const [open, setOpen] = useState(false);
  const [loggedUser, setLoggedUser] = useState();
  const { logout } = useAuth();
  const panelRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    console.log("savedUser.email", savedUser.email)
    setLoggedUser(JSON.parse(savedUser));
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Brand Section */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                  Edu<span className="text-indigo-600">Sphere</span>
                </h1>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all">
                <HelpCircle size={16} />
                <span className="hidden sm:inline">Help</span>
              </button> */}

              {/* User Toggle */}
              <div className="relative">
                <button
                  onClick={() => setOpen((s) => !s)}
                  className={`flex items-center gap-2 rounded-full border border-gray-200 p-1 pl-3 transition-all hover:shadow-md ${open ? 'ring-2 ring-indigo-100 border-indigo-200' : ''
                    }`}
                >
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {loggedUser?.full_name?.split(' ')[0] || 'Guest'}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {loggedUser?.full_name ? loggedUser.full_name.charAt(0) : <User size={14} />}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {open && (
                  <div
                    ref={panelRef}
                    className="absolute right-0 top-full mt-3 w-72 origin-top-right overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 transition-all animate-in fade-in slide-in-from-top-2"
                  >
                    {/* User Header Background */}
                    <div className="bg-gray-50/50 p-6 text-center border-b border-gray-100">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white">
                          {loggedUser?.full_name ? loggedUser.full_name.charAt(0) : "G"}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {loggedUser?.full_name || "Guest User"}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">{loggedUser?.email || "guest@edusphere.com"}</p>
                      <span className="mt-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 tracking-wide">
                        {loggedUser?.username}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl p-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}


