import {
  createFrontendModule,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import AdminIcon from '@material-ui/icons/Tune';

/*
 * The platform admins' page. The backend (packages/backend/src/plugins/admin)
 * refuses anyone outside platform-admins; the sidebar only shows the entry
 * to them (modules/nav).
 */
// A route ref is what makes the page show up in the nav items.
const adminRouteRef = createRouteRef();

const adminPage = PageBlueprint.make({
  name: 'admin',
  params: {
    path: '/admin',
    routeRef: adminRouteRef,
    title: 'Admin',
    icon: <AdminIcon />,
    loader: () => import('./AdminPage').then(m => <m.AdminPage />),
  },
});

export const adminModule = createFrontendModule({
  pluginId: 'app',
  extensions: [adminPage],
});
