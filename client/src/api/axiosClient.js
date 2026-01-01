// client/src/api/axiosClient.js

import axios from "axios";
import { getAccessToken, clearAccessToken } from "./tokenStore";

const API_BASE = "/api"; // handled by proxy (maps to localhost:8080)

// Create main Axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 480000, // 8 minutes – matches backend timeout for long OpenAI calls
});

// 🔹 Inject Bearer token into every request
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// 🔹 Unified response & error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalUrl = error.config?.url || "";

    // ✅ Skip auto-logout if it’s a download endpoint
    const isDownloadRoute = originalUrl.includes("/download");

    if (error.response?.status === 401 && !isDownloadRoute) {
      clearAccessToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // ⏳ Friendly timeout message for long AI calls
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      alert("⏳ The request took too long and was aborted. Please try again.");
    }

    return Promise.reject(error);
  },
);

// 🔹 Safe PDF download utility
export const apiDownload = async (url, filename = "file.pdf") => {
  try {
    const token = getAccessToken();
    const res = await axios.get(url, {
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });

    if (res.status !== 200) {
      throw new Error(`Failed to download: ${res.status}`);
    }

    const blob = new Blob([res.data], { type: "application/pdf" });
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(fileUrl);
  } catch (err) {
    console.error("PDF download failed:", err);
    alert("Failed to download PDF. Please try again.");
  }
};

export default api;
