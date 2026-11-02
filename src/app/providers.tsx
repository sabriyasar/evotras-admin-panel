'use client';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { store } from '@/store';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={trTR} theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8, fontFamily: 'inherit' } }}>
        <Provider store={store}>{children}</Provider>
      </ConfigProvider>
    </AntdRegistry>
  );
}
