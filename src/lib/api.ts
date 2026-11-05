import axios from "axios";

export const USER_KEY = "platform_user";

export const api = axios.create({
  // Tüm istekler Next.js proxy üzerinden geçer.
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// CSRF token'ı bellekte tutuyoruz.
let csrfToken: string | null = null;

// Backend'den CSRF token'ını al.
export const initializeCsrf = async () => {
  const response = await api.get("/auth/csrf");

  csrfToken = response.data.token;

  if (!csrfToken) {
    throw new Error("CSRF token alınamadı");
  }

  return csrfToken;
};

// POST, PUT, PATCH ve DELETE isteklerine CSRF header'ı ekle.
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();

  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method ?? "")) {
    config.headers.set("X-XSRF-TOKEN", csrfToken);
  }

  return config;
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
