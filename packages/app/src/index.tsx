import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';
// IdPlatformKit's fonts, bundled (no font CDN). Used by modules/theme.
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/jetbrains-mono';

ReactDOM.createRoot(document.getElementById('root')!).render(App.createRoot());
