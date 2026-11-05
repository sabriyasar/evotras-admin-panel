"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  GlobalOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSaveError,
  fetchTenants,
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

export default function TenantsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, saved } = useAppSelector((s) => s.tenants);
  const [modal, setModal] = useState<ModalState>(null);
  const [msg, ctx] = message.useMessage();

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  useEffect(() => {
    if (saved > 0) {
      setModal(null);
      msg.success("Kaydedildi");
    }
  }, [saved, msg]);

  const open = (m: ModalState) => {
    dispatch(clearSaveError());
    setModal(m);
  };

  const stats = useMemo(() => {
    const soon = dayjs().add(30, "day");

    return {
      total: items.length,
      active: items.filter((t) => t.status === "ACTIVE" || t.status === "TRIAL")
        .length,
      blocked: items.filter(
        (t) => t.status === "SUSPENDED" || t.status === "EXPIRED",
      ).length,
      soon: items.filter(
        (t) => t.expiresAt && dayjs(t.expiresAt).isBefore(soon),
      ).length,
    };
  }, [items]);

  const columns: ColumnsType<Tenant> = [
    {
      title: "Mağaza",
      render: (_, t) => (
        <div>
          <b>{t.name}</b>
          <div style={{ color: "#6b7280", fontSize: 12 }}>{t.slug}</div>
        </div>
      ),
    },
    {
      title: "Adresler",
      render: (_, t) => (
        <Space direction="vertical" size={8}>
          {(t.domainDetails ?? []).length > 0 ? (
            t.domainDetails.map((domain) => (
              <Space key={domain.id} size={8} wrap>
                <a
                  href={`https://${domain.host}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {domain.host}
                </a>

                <Tag color={domain.verified ? "success" : "warning"}>
                  {domain.verified ? "Doğrulandı" : "Doğrulanmadı"}
                </Tag>

                <Button
                  size="small"
                  onClick={() =>
                    open({
                      kind: "verification",
                      tenant: t,
                      domain,
                    })
                  }
                >
                  DNS Doğrula
                </Button>
              </Space>
            ))
          ) : (
            (t.domains ?? []).map((domain) => (
              <div key={domain}>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {domain}
                </a>
              </div>
            ))
          )}
        </Space>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan",
      render: (plan: string | null) => (plan ? <Tag>{plan}</Tag> : "-"),
    },
    {
      title: "Lisans",
      dataIndex: "status",
      render: (s: LicenseStatus | null) =>
        s ? <Tag color={COLOR[s]}>{STATUS_LABEL[s]}</Tag> : <Tag>Yok</Tag>,
    },
    {
      title: "Lisans dönemi",
      render: (_, t) => (
        <div>
          <div>{t.startsAt ? dayjs(t.startsAt).format("DD.MM.YYYY") : "-"}</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Bitiş: {t.expiresAt ? dayjs(t.expiresAt).format("DD.MM.YYYY") : "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Limitler",
      render: (_, t) => (
        <div>
          <div>Ürün: {t.maxProducts ?? "-"}</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Kullanıcı: {t.maxUsers ?? "-"}
          </div>
        </div>
      ),
    },
    {
      title: "",
      align: "right",
      render: (_, t) => (
        <Space>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => open({ kind: "license", tenant: t })}
          >
            Lisans
          </Button>
          <Button
            size="small"
            icon={<GlobalOutlined />}
            onClick={() => open({ kind: "domain", tenant: t })}
          >
            Domain
          </Button>
          <Button
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => open({ kind: "user", tenant: t })}
          >
            Kullanıcı
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {ctx}

      <div className="page-head">
        <h1>Mağazalar ve Lisanslar</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => open({ kind: "create" })}
        >
          Yeni mağaza
        </Button>
      </div>

      <Row gutter={[16, 16]} className="stats">
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Toplam mağaza" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Aktif lisans" value={stats.active} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Askıda / süresi dolmuş" value={stats.blocked} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="30 gün içinde bitecek" value={stats.soon} />
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 800 }}
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
