# evotras-platform
Platform yönetim paneli (platform.evotras.com): mağaza, lisans, domain ve kullanıcı açma.
Next.js 16 · Ant Design · SCSS · Redux Toolkit · Redux-Saga · Axios (Node 20.9+)

    npm install
    cp .env.example .env.local
    npm run dev    # http://localhost:3002

Giriş: backend `.env` içindeki PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD.
Backend CORS'ta http://localhost:* izinli olmalı (varsayılan öyle).
