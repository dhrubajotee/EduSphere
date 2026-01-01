// client/src/api/tokenStore.js

export const setAccessToken = (token) => {
  localStorage.setItem("access_token", token);
};

export const getAccessToken = () => {
  return localStorage.getItem("access_token");
};

export const clearAccessToken = () => {
  localStorage.removeItem("access_token");
};

