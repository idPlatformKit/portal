import { createFrontendModule } from '@backstage/frontend-plugin-api';
import './bui.css';
import { darkTheme, lightTheme } from './themes';

/** IdPlatformKit's light and dark themes, replacing Backstage's defaults. */
export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [lightTheme, darkTheme],
});
