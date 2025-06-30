import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import UpdateNotification from '../components/UpdateNotification'; // Importez le nouveau composant

const theme = createTheme({
  palette: {
    primary: {
      main: '#0D47A1', // Un bleu marine profond
    },
    secondary: {
      main: '#D32F2F', // Un rouge audacieux
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

function MyApp({ Component, pageProps }) {
  const [isUpdateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Enregistre le service worker
      navigator.serviceWorker.register('/sw.js').then(registration => {
        // En cas de mise à jour trouvée
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            // Si le nouveau worker est installé et en attente
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Un nouveau Service Worker est prêt à être activé.');
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      });

      // Écouteur pour recharger la page quand le nouveau SW prend le contrôle
      let refreshing;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Envoie un message au Service Worker pour qu'il s'active
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <title>CNOL 2025</title>
        <link rel="stylesheet" href="https://unpkg.com/@uiw/react-md-editor@3.22.0/dist/mdeditor.css" />
        <link rel="stylesheet" href="https://unpkg.com/@uiw/react-markdown-preview@3.22.0/dist/markdown.css" />
      </Head>
      <Toaster position="top-center" reverseOrder={false} />
      <Component {...pageProps} />
      {isUpdateAvailable && <UpdateNotification onUpdate={handleUpdate} />}
    </ThemeProvider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;