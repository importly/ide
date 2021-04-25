import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/firepad.css';
import {AppProps} from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;