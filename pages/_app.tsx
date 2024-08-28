import type { AppProps } from 'next/app';
import '../src/styles/main.less';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
