import type { AppProps } from 'next/app';
import '../src/styles/main.less';
import { Layout } from 'antd';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Layout.Content style={{ minHeight: '100vh' }}>
        <Component {...pageProps} />
      </Layout.Content>
    </Layout>
  );
}
