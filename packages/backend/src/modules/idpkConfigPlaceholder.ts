import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';

/**
 * Resolves `$idpkConfig: <key>` in catalog entities to the `idpk.<key>`
 * config value, e.g. `$idpkConfig: github.org`.
 *
 * The Software Templates restrict pull requests to the installation's own
 * GitHub org and instances repository, which differ per installation. Catalog
 * files don't get config substitution, and the built-in `$text` placeholder
 * can't read local files, so the templates read these values from config,
 * which takes them from the environment (IDPK_GITHUB_ORG,
 * IDPK_INSTANCES_REPO).
 */
export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'idpk-config-placeholder',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ catalog, config }) {
        catalog.addPlaceholderResolver('idpkConfig', async ({ value }) => {
          if (typeof value !== 'string') {
            throw new Error(
              '$idpkConfig expects a config key under idpk, e.g. github.org',
            );
          }
          return config.getString(`idpk.${value}`);
        });
      },
    });
  },
});
