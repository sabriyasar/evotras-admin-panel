'use client';
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { saveRequest, Tenant } from '@/store/tenantsSlice';

const PLANS = [{ value: 'STARTER', label: 'Başlangıç' }, { value: 'STANDARD', label: 'Standart' }, { value: 'PRO', label: 'Pro' }];
export const STATUS_LABEL = { TRIAL: 'Deneme', ACTIVE: 'Aktif', SUSPENDED: 'Askıda', EXPIRED: 'Süresi doldu' } as const;
const date = (v: dayjs.Dayjs) => v.format('YYYY-MM-DD');

function Base({ title, onClose, onOk, children }: { title: string; onClose: () => void; onOk: () => void; children: React.ReactNode }) {
  const { saving, saveError } = useAppSelector((s) => s.tenants);
  return (
    <Modal open title={title} onCancel={onClose} onOk={onOk} confirmLoading={saving} okText="Kaydet" cancelText="Vazgeç" maskClosable={false}>
      {saveError && <Alert type="error" message={saveError} showIcon style={{ marginBottom: 16 }} />}
      {children}
    </Modal>
  );
}

export function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  return (
    <Base title="Yeni mağaza ve lisans" onClose={onClose} onOk={() => form.validateFields().then((v) =>
      dispatch(saveRequest({ kind: 'create', body: { ...v, expiresAt: date(v.expiresAt) } })))}>
      <Form form={form} layout="vertical" initialValues={{ plan: 'STANDARD', expiresAt: dayjs().add(1, 'year'), maxProducts: 1000, maxUsers: 5 }}>
        <Form.Item name="name" label="Mağaza adı" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="slug" label="Mağaza adresi" extra="Küçük harf, rakam ve tire. Örn: akvaryumcuyuz"
          rules={[{ required: true }, { pattern: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, message: 'Geçersiz adres (en az 3 karakter)' }]}>
          <Input addonAfter=".evotras.com" />
        </Form.Item>
        <Form.Item name="ownerName" label="Mağaza sahibi" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="ownerEmail" label="Sahip e-postası" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="ownerPassword" label="Geçici şifre" rules={[{ required: true, min: 8, message: 'En az 8 karakter' }]}><Input.Password /></Form.Item>
        <Form.Item name="plan" label="Plan"><Select options={PLANS} /></Form.Item>
        <Form.Item name="expiresAt" label="Lisans bitiş tarihi" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxProducts" label="Ürün limiti"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxUsers" label="Kullanıcı limiti"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Base>
  );
}

export function LicenseModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  return (
    <Base title={`Lisans — ${tenant.name}`} onClose={onClose} onOk={() => form.validateFields().then((v) =>
      dispatch(saveRequest({ kind: 'license', id: tenant.id, body: { ...v, expiresAt: date(v.expiresAt) } })))}>
      <Form form={form} layout="vertical" initialValues={{
        plan: tenant.plan ?? 'STANDARD', status: tenant.status ?? 'ACTIVE',
        expiresAt: tenant.expiresAt ? dayjs(tenant.expiresAt) : dayjs().add(1, 'year'),
        maxProducts: tenant.maxProducts ?? 1000, maxUsers: tenant.maxUsers ?? 5 }}>
        <Form.Item name="plan" label="Plan"><Select options={PLANS} /></Form.Item>
        <Form.Item name="status" label="Durum">
          <Select options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="expiresAt" label="Bitiş tarihi" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxProducts" label="Ürün limiti" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxUsers" label="Kullanıcı limiti" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Base>
  );
}

export function DomainModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  return (
    <Base title={`Domain ekle — ${tenant.name}`} onClose={onClose} onOk={() => form.validateFields().then((v) =>
      dispatch(saveRequest({ kind: 'domain', id: tenant.id, body: v })))}>
      <Form form={form} layout="vertical">
        <Form.Item name="host" label="Domain" extra="Örn: www.magazam.com — DNS ve Vercel ayarı ayrıca yapılmalıdır." rules={[{ required: true }]}><Input /></Form.Item>
      </Form>
    </Base>
  );
}

export function UserModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  return (
    <Base title={`Kullanıcı ekle — ${tenant.name}`} onClose={onClose} onOk={() => form.validateFields().then((v) =>
      dispatch(saveRequest({ kind: 'user', id: tenant.id, body: v })))}>
      <Form form={form} layout="vertical" initialValues={{ role: 'STORE_STAFF' }}>
        <Form.Item name="fullName" label="Ad soyad" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="password" label="Geçici şifre" rules={[{ required: true, min: 8, message: 'En az 8 karakter' }]}><Input.Password /></Form.Item>
        <Form.Item name="role" label="Rol"><Select options={[{ value: 'STORE_OWNER', label: 'Mağaza sahibi' }, { value: 'STORE_STAFF', label: 'Personel' }]} /></Form.Item>
      </Form>
    </Base>
  );
}
