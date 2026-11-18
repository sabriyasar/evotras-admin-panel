"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popover,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleFilled,
  GlobalOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSaveError,
  clearPrimaryError,
  fetchTenants,
  makeDomainPrimary,
  DomainDto,
  LicenseStatus,
  Tenant,
} from "@/store/tenantsSlice";
import {
  CreateTenantModal,
  DomainModal,
  LicenseModal,
  STATUS_LABEL,
  UserModal,
  DomainVerificationModal,
} from "@/components/Modals";

const COLOR: Record<LicenseStatus, string> = {
  TRIAL: "blue",
  ACTIVE: "green",
  SUSPENDED: "orange",
  EXPIRED: "red",
};

type ModalState =
  | { kind: "create" }
  | { kind: "license" | "domain" | "user"; tenant: Tenant }
  | { kind: "verification"; tenant: Tenant; domain: DomainDto }
  | null;

type Filter = "all" | "active" | "blocked" | "soon";

const VISIBLE_DOMAINS = 2;

const isBlocked = (t: Tenant) =>
  t.status === "SUSPENDED" || t.status === "EXPIRED";

const isActive = (t: Tenant) => t.status === "ACTIVE" || t.status === "TRIAL";

/** Bitişe 30 gün veya daha az kaldıysa (ya da geçtiyse) true. */
const endsSoon = (t: Tenant) =>
  !!t.expiresAt && dayjs(t.expiresAt).isBefore(dayjs().add(30, "day"));

function remainingLabel(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return { text: "Süresiz", color: undefined as string | undefined };
  }

  const days = dayjs(expiresAt).endOf("day").diff(dayjs(), "day");

  if (days < 0) {
    return { text: "Süresi doldu", color: "#cf1322" };
  }

  if (days === 0) {
    return { text: "Bugün bitiyor", color: "#d46b08" };
  }

  return {
    text: `${days} gün kaldı`,
    color: days <= 30 ? "#d46b08" : undefined,
  };
}

export default function TenantsPage() {
  const dispatch = useAppDispatch();

  const {
    items,
    loading,
    error,
    saved,
    primarySaving,
    primarySaved,
    primaryError,
  } = useAppSelector((s) => s.tenants);

  const [modal, setModal] = useState<ModalState>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const [msg, ctx] = message.useMessage();
  const { token } = theme.useToken();

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  useEffect(() => {
    if (saved > 0) {
      setModal(null);
      msg.success("Kaydedildi");
    }
  }, [saved, msg]);

  useEffect(() => {
    if (primarySaved > 0) {
      msg.success("Birincil domain başarıyla güncellendi.");
    }
  }, [primarySaved, msg]);

  useEffect(() => {
    if (primaryError) {
      msg.error(primaryError);
      dispatch(clearPrimaryError());
    }
  }, [primaryError, dispatch, msg]);

  const open = (m: ModalState) => {
    dispatch(clearSaveError());
    setModal(m);
  };

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter(isActive).length,
      blocked: items.filter(isBlocked).length,
      soon: items.filter(endsSoon).length,
    }),
    [items],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((t) => {
      if (filter === "active" && !isActive(t)) return false;
      if (filter === "blocked" && !isBlocked(t)) return false;
      if (filter === "soon" && !endsSoon(t)) return false;

      if (!q) return true;

      const hosts = [
        ...(t.domainDetails ?? []).map((d) => d.host),
        ...(t.domains ?? []),
      ];

      return [t.name, t.slug, ...hosts].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [items, filter, query]);

  const muted = { color: token.colorTextSecondary, fontSize: 12 } as const;

  const renderDomain = (t: Tenant, domain: DomainDto) => (
    <Space key={domain.id} size={8} wrap>
      <a href={`https://${domain.host}`} target="_blank" rel="noreferrer">
        {domain.host}
      </a>

      {domain.verified ? (
        <Tooltip title="DNS doğrulandı">
          <CheckCircleFilled
            style={{ color: token.colorSuccess }}
            aria-label="DNS doğrulandı"
          />
        </Tooltip>
      ) : (
        <>
          <Tag color="warning" style={{ marginInlineEnd: 0 }}>
            Doğrulanmadı
          </Tag>

          <Button
            size="small"
            type="link"
            style={{ padding: 0 }}
            onClick={() => open({ kind: "verification", tenant: t, domain })}
          >
            DNS doğrula
          </Button>
        </>
      )}

      {domain.primary ? (
        <Tag color="blue" style={{ marginInlineEnd: 0 }}>
          Birincil
        </Tag>
      ) : (
        domain.verified && (
          <Button
            size="small"
            type="link"
            disabled={primarySaving}
            loading={primarySaving}
            style={{ padding: 0 }}
            onClick={() => {
              Modal.confirm({
                title: "Birincil domain değiştirilsin mi?",
                content: `Diğer adresler artık ${domain.host} adresine yönlenecek. Bu domain birincil adres olarak ayarlansın mı?`,
                okText: "Birincil yap",
                cancelText: "Vazgeç",
                centered: true,
                onOk: () => {
                  dispatch(
                    makeDomainPrimary({
                      tenantId: t.id,
                      domainId: domain.id,
                    }),
                  );
                },
              });
            }}
          >
            Birincil yap
          </Button>
        )
      )}
    </Space>
  );

  const columns: ColumnsType<Tenant> = [
    {
      title: "Mağaza",
      width: 240,
      render: (_, t) => (
        <Space size={12} align="center">
          <Avatar
            shape="square"
            style={{
              background: token.colorFillSecondary,
              color: token.colorText,
              fontWeight: 600,
            }}
          >
            {(t.name ?? "?").trim().charAt(0).toUpperCase()}
          </Avatar>

          <div>
            <b>{t.name}</b>
            <div style={muted}>{t.slug}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Adresler",
      render: (_, t) => {
        const details = t.domainDetails ?? [];

        if (details.length === 0) {
          const plain = t.domains ?? [];

          return plain.length > 0 ? (
            <Space direction="vertical" size={4}>
              {plain.map((host) => (
                <a
                  key={host}
                  href={`https://${host}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {host}
                </a>
              ))}
            </Space>
          ) : (
            <span style={muted}>Domain yok</span>
          );
        }

        const shown = details.slice(0, VISIBLE_DOMAINS);
        const rest = details.slice(VISIBLE_DOMAINS);

        return (
          <Space direction="vertical" size={6}>
            {shown.map((d) => renderDomain(t, d))}

            {rest.length > 0 && (
              <Popover
                trigger="click"
                title="Diğer adresler"
                content={
                  <Space direction="vertical" size={8}>
                    {rest.map((d) => renderDomain(t, d))}
                  </Space>
                }
              >
                <Button size="small" type="link" style={{ padding: 0 }}>
                  +{rest.length} adres daha
                </Button>
              </Popover>
            )}
          </Space>
        );
      },
    },
    {
      title: "Lisans",
      width: 220,
      render: (_, t) => {
        const remaining = remainingLabel(t.expiresAt);

        return (
          <div>
            <Space size={6} wrap>
              {t.status ? (
                <Tag color={COLOR[t.status]} style={{ marginInlineEnd: 0 }}>
                  {STATUS_LABEL[t.status]}
                </Tag>
              ) : (
                <Tag style={{ marginInlineEnd: 0 }}>Lisans yok</Tag>
              )}

              {t.plan && <Tag style={{ marginInlineEnd: 0 }}>{t.plan}</Tag>}
            </Space>

            {t.status && (
              <div style={{ ...muted, marginTop: 4 }}>
                {t.startsAt ? dayjs(t.startsAt).format("DD.MM.YYYY") : "-"}
                {" – "}
                {t.expiresAt ? dayjs(t.expiresAt).format("DD.MM.YYYY") : "-"}
                <span
                  style={{
                    marginLeft: 8,
                    color: remaining.color ?? token.colorTextSecondary,
                    fontWeight: remaining.color ? 600 : 400,
                  }}
                >
                  {remaining.text}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Limitler",
      width: 150,
      render: (_, t) => (
        <div>
          <div>{t.maxProducts ?? "-"} ürün</div>
          <div style={muted}>{t.maxUsers ?? "-"} kullanıcı</div>
        </div>
      ),
    },
    {
      title: "",
      align: "right",
      width: 150,
      render: (_, t) => (
        <Space size={4}>
          <Tooltip title="Lisansı düzenle">
            <Button
              type="text"
              aria-label="Lisansı düzenle"
              icon={<SafetyCertificateOutlined />}
              onClick={() => open({ kind: "license", tenant: t })}
            />
          </Tooltip>
          <Tooltip title="Domain ekle">
            <Button
              type="text"
              aria-label="Domain ekle"
              icon={<GlobalOutlined />}
              onClick={() => open({ kind: "domain", tenant: t })}
            />
          </Tooltip>
          <Tooltip title="Kullanıcı ekle">
            <Button
              type="text"
              aria-label="Kullanıcı ekle"
              icon={<UserAddOutlined />}
              onClick={() => open({ kind: "user", tenant: t })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      {ctx}

      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 2 }}>Mağazalar ve lisanslar</h1>
          <span style={muted}>
            {counts.all} mağaza
            {counts.blocked > 0 && `, ${counts.blocked} tanesi askıda`}
            {counts.soon > 0 && `, ${counts.soon} lisansın bitişi yakın`}
          </span>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => open({ kind: "create" })}
        >
          Yeni mağaza
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Tümü (${counts.all})` },
            { value: "active", label: `Aktif (${counts.active})` },
            {
              value: "blocked",
              label: `Askıda / süresi dolmuş (${counts.blocked})`,
            },
            { value: "soon", label: `30 gün içinde bitecek (${counts.soon})` },
          ]}
        />

        <Input
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Mağaza, kısa ad veya domain ara"
          aria-label="Mağaza ara"
          style={{ width: 300, maxWidth: "100%" }}
        />
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  items.length === 0
                    ? "Henüz mağaza yok"
                    : "Bu filtreyle eşleşen mağaza yok"
                }
              >
                {items.length === 0 ? (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => open({ kind: "create" })}
                  >
                    İlk mağazayı oluştur
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {modal?.kind === "create" && (
        <CreateTenantModal onClose={() => setModal(null)} />
      )}

      {modal?.kind === "license" && modal.tenant && (
        <LicenseModal tenant={modal.tenant} onClose={() => setModal(null)} />
      )}

      {modal?.kind === "domain" && modal.tenant && (
        <DomainModal tenant={modal.tenant} onClose={() => setModal(null)} />
      )}

      {modal?.kind === "user" && modal.tenant && (
        <UserModal tenant={modal.tenant} onClose={() => setModal(null)} />
      )}

      {modal?.kind === "verification" && (
        <DomainVerificationModal
          tenant={modal.tenant}
          domain={modal.domain}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
