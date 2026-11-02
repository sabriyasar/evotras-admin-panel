import axios from "axios";

export const USER_KEY = "platform_user";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  timeout: 15000,

  // Backend cookie tabanlı oturum kullanıyor.
  withCredentials: true,

  // Axios, XSRF-TOKEN cookie değerini X-XSRF-TOKEN başlığına aktarır.
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Oturum süresi dolduysa giriş sayfasına yönlendir.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !location.pathname.startsWith("/login")
    ) {
      localStorage.removeItem(USER_KEY);
      location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export const errMsg = (error: unknown) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.message ?? "Sunucuya ulaşılamadı")
    : ((error as Error).message ?? "Bir hata oluştu");
