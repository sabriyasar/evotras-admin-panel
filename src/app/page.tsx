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
type Tone = "error" | "warning" | undefined;

const VISIBLE_DOMAINS = 2;

const isBlocked = (t: Tenant) =>
  t.status === "SUSPENDED" || t.status === "EXPIRED";

const isActive = (t: Tenant) => t.status === "ACTIVE" || t.status === "TRIAL";

/** Bitişe 30 gün veya daha az kaldıysa (ya da geçtiyse) true. */
const endsSoon = (t: Tenant) =>
  !!t.expiresAt && dayjs(t.expiresAt).isBefore(dayjs().add(30, "day"));

function remainingLabel(expiresAt: string | null | undefined): {
  text: string;
  tone: Tone;
} {
  if (!expiresAt) {
    return { text: "Süresiz", tone: undefined };
  }

  const days = dayjs(expiresAt).endOf("day").diff(dayjs(), "day");

  if (days < 0) {
    return { text: "Süresi doldu", tone: "error" };
  }

  if (days === 0) {
    return { text: "Bugün bitiyor", tone: "warning" };
  }

  return {
    text: `${days} gün kaldı`,
    tone: days <= 30 ? "warning" : undefined,
  };
}

/** Birincil domain her zaman ilk sırada görünsün. */
const sortDomains = (list: DomainDto[]) =>
  [...list].sort((a, b) => Number(!!b.primary) - Number(!!a.primary));

/** Tek satıra sığmayan metni kesip "…" ile bitirir; komşu öğelerin üstüne binmez. */
const ellipsis = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

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
  const [pendingDomainId, setPendingDomainId] = useState<
    DomainDto["id"] | null
  >(null);

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

  // İşlem bitince yalnızca tıklanan satırdaki yükleme durumunu temizle.
  useEffect(() => {
    if (!primarySaving) setPendingDomainId(null);
  }, [primarySaving]);

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

  const toneColor = (tone: Tone) =>
    tone === "error"
      ? token.colorError
      : tone === "warning"
        ? token.colorWarning
        : token.colorTextSecondary;

  const confirmPrimary = (t: Tenant, domain: DomainDto) => {
    Modal.confirm({
      title: "Birincil domain değiştirilsin mi?",
      content: `Diğer adresler artık ${domain.host} adresine yönlenecek. Bu domain birincil adres olarak ayarlansın mı?`,
      okText: "Birincil yap",
      cancelText: "Vazgeç",
      centered: true,
      onOk: () => {
        setPendingDomainId(domain.id);
        dispatch(
          makeDomainPrimary({
            tenantId: t.id,
            domainId: domain.id,
          }),
        );
      },
    });
  };

  /**
   * Tek domain satırı: solda adres (uzunsa kesilir), sağda durum ve işlem.
   * Sağ taraf sabit genişlikte kalır, böylece hiçbir öğe diğerinin üstüne binmez.
   */
  const renderDomain = (t: Tenant, domain: DomainDto) => (
    <div
      key={domain.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <a
        href={`https://${domain.host}`}
        target="_blank"
        rel="noreferrer"
        title={domain.host}
        style={{ flex: "1 1 auto", ...ellipsis }}
      >
        {domain.host}
      </a>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: "none",
        }}
      >
        {domain.verified ? (
          <Tooltip title="DNS doğrulandı">
            <CheckCircleFilled
              style={{ color: token.colorSuccess }}
              aria-label="DNS doğrulandı"
            />
          </Tooltip>
        ) : (
          <Tag color="warning" style={{ margin: 0 }}>
            Doğrulanmadı
          </Tag>
        )}

        {domain.primary && (
          <Tag color="blue" style={{ margin: 0 }}>
            Birincil
          </Tag>
        )}

        {!domain.verified && (
          <Button
            size="small"
            onClick={() => open({ kind: "verification", tenant: t, domain })}
          >
            DNS doğrula
          </Button>
        )}

        {domain.verified && !domain.primary && (
          <Button
            size="small"
            disabled={primarySaving}
            loading={primarySaving && pendingDomainId === domain.id}
            onClick={() => confirmPrimary(t, domain)}
          >
            Birincil yap
          </Button>
        )}
      </div>
    </div>
  );

  const columns: ColumnsType<Tenant> = [
    {
      title: "Mağaza",
      width: 220,
      render: (_, t) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <Avatar
            shape="square"
            style={{
              flex: "none",
              background: token.colorFillSecondary,
              color: token.colorText,
              fontWeight: 600,
            }}
          >
            {(t.name ?? "?").trim().charAt(0).toUpperCase()}
          </Avatar>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, ...ellipsis }} title={t.name}>
              {t.name}
            </div>
            <div style={{ ...muted, ...ellipsis }} title={t.slug}>
              {t.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Adresler",
      width: 440,
      render: (_, t) => {
        const details = sortDomains(t.domainDetails ?? []);

        if (details.length === 0) {
          const plain = t.domains ?? [];

          if (plain.length > 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plain.map((host) => (
                  <a
                    key={host}
                    href={`https://${host}`}
                    target="_blank"
                    rel="noreferrer"
                    title={host}
                    style={ellipsis}
                  >
                    {host}
                  </a>
                ))}
              </div>
            );
          }

          return (
            <Space size={8}>
              <span style={muted}>Domain yok</span>
              <Button
                size="small"
                type="link"
                style={{ padding: 0 }}
                onClick={() => open({ kind: "domain", tenant: t })}
              >
                Domain ekle
              </Button>
            </Space>
          );
        }

        const shown = details.slice(0, VISIBLE_DOMAINS);
        const rest = details.slice(VISIBLE_DOMAINS);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map((d) => renderDomain(t, d))}

            {rest.length > 0 && (
              <Popover
                trigger="click"
                placement="bottomLeft"
                title="Diğer adresler"
                content={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      width: 420,
                      maxWidth: "80vw",
                    }}
                  >
                    {rest.map((d) => renderDomain(t, d))}
                  </div>
                }
              >
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0, alignSelf: "flex-start" }}
                >
                  +{rest.length} adres daha
                </Button>
              </Popover>
            )}
          </div>
        );
      },
    },
    {
      title: "Lisans",
      width: 230,
      render: (_, t) => {
        const remaining = remainingLabel(t.expiresAt);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Space size={4} wrap>
              {t.status ? (
                <Tag color={COLOR[t.status]} style={{ margin: 0 }}>
                  {STATUS_LABEL[t.status]}
                </Tag>
              ) : (
                <Tag style={{ margin: 0 }}>Lisans yok</Tag>
              )}

              {t.plan && <Tag style={{ margin: 0 }}>{t.plan}</Tag>}
            </Space>

            {t.status && (
              <>
                <div style={muted}>
                  {t.startsAt ? dayjs(t.startsAt).format("DD.MM.YYYY") : "-"}
                  {" – "}
                  {t.expiresAt ? dayjs(t.expiresAt).format("DD.MM.YYYY") : "-"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: toneColor(remaining.tone),
                    fontWeight: remaining.tone ? 600 : 400,
                  }}
                >
                  {remaining.text}
                </div>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: "Limitler",
      width: 120,
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
      width: 140,
      fixed: "right",
      render: (_, t) => (
        <Space size={2} style={{ whiteSpace: "nowrap" }}>
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: "0 0 4px" }}>Mağazalar ve lisanslar</h1>
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
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Dar ekranda filtreler taşmasın, kendi içinde kaysın. */}
        <div style={{ maxWidth: "100%", overflowX: "auto" }}>
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
              {
                value: "soon",
                label: `30 gün içinde bitecek (${counts.soon})`,
              },
            ]}
          />
        </div>

        <Input
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Mağaza, kısa ad veya domain ara"
          aria-label="Mağaza ara"
          style={{ flex: "1 1 260px", maxWidth: 360 }}
        />
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          tableLayout="fixed"
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 1150 }}
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
