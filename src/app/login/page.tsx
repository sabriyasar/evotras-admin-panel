"use client";
import { Alert, Button, Card, Form, Input } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginRequest } from "@/store/authSlice";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);
  return (
    <div className="center">
      <Card className="login-card" title="Evotras Platform Girişi">
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form layout="vertical" onFinish={(v) => dispatch(loginRequest(v))}>
          <Form.Item
            name="email"
            label="E-posta"
            rules={[
              {
                required: true,
                type: "email",
                message: "Geçerli bir e-posta girin",
              },
            ]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Şifre"
            rules={[{ required: true, message: "Şifre girin" }]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Giriş yap
          </Button>
        </Form>
      </Card>
    </div>
  );
}
