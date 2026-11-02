"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Layout, Spin } from "antd";
import { LogoutOutlined, ShopOutlined, AppstoreOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrate, logout } from "@/store/authSlice";
import { USER_KEY } from "@/lib/api";

export default function Shell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const path = usePathname();
  const { user, ready } = useAppSelector((s) => s.auth);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      dispatch(hydrate(raw ? JSON.parse(raw) : null));
    } catch {
      dispatch(hydrate(null));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!ready) return;
    if (!user && path !== "/login") router.replace("/login");
    if (user && path === "/login") router.replace("/");
  }, [ready, user, path, router]);

  if (!ready) return <div className="center"><Spin size="large" /></div>;
  if (path === "/login") return <>{children}</>;
  if (!user) return null;

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Header className="shell-header">
        <div className="brand">
          evotras<span>Platform</span>
        </div>

        <div className="shell-nav">
          <Link href="/" className={path === "/" ? "active" : ""}>
            <ShopOutlined /> Mağazalar
          </Link>
          <Link href="/products" className={path.startsWith("/products") ? "active" : ""}>
            <AppstoreOutlined /> Ürünler
          </Link>
        </div>

        <div className="who">
          {user.email}
          <Button size="small" icon={<LogoutOutlined />} onClick={() => dispatch(logout())}>
            Çıkış
          </Button>
        </div>
      </Layout.Header>
      <main className="container">{children}</main>
    </Layout>
  );
}
