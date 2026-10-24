# IDPK Portal

**IDPK Portal** is an Internal Developer Portal built on [Backstage](https://backstage.io). It serves as a centralized hub for engineering teams to discover services, manage software components, run scaffolder templates, browse TechDocs, and interact with Kubernetes workloads — all in one place.

The portal is part of the **idPlatformKit** project, which provides a production-ready Backstage setup with GitHub authentication, a software catalog, a scaffolder, and search out of the box.

---

## Getting Started

```sh
yarn install
yarn start
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:7007`.

Without options, `yarn start` loads `app-config.yaml` and then `app-config.local.yaml` on top of it. Keep secrets and personal overrides in `app-config.local.yaml` (git-ignored). Don't start with `--config app-config.local.yaml` alone: passing `--config` replaces the default files, so `app-config.yaml` is silently skipped. That's how removing a block from the local file once disabled the GitHub org import, because the committed copy in `app-config.yaml` was never loaded.

---

## Configuration (`app-config.yaml`)

All runtime configuration lives in `app-config.yaml` at the project root. The sections below cover the key areas you will need to configure.

### GitHub Integration

Used by the catalog, scaffolder, and other plugins to interact with the GitHub API on behalf of the portal.

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

Set a [GitHub Personal Access Token (PAT)](https://backstage.io/docs/integrations/github/locations#configuration) as the `GITHUB_TOKEN` environment variable before starting the app.

---

### GitHub OAuth Authentication

IDPK Portal uses GitHub as its sign-in provider. Users authenticate with their GitHub account via OAuth and are matched to a `User` entity in the catalog by their GitHub username.

#### 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in the fields:
   | Field | Value |
   |---|---|
   | Application name | IDPK Portal (or any name) |
   | Homepage URL | `http://localhost:3000` |
   | Authorization callback URL | `http://localhost:7007/api/auth/github/handler/frame` |
3. After creating the app, copy the **Client ID** and generate a **Client Secret**.

#### 2. Configure `app-config.yaml`

```yaml
auth:
  environment: development
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
        signIn:
          resolvers:
            # Match the GitHub username to a User entity in the catalog
            - resolver: usernameMatchingUserEntityName
```

> **Important:** Never hardcode `clientId` or `clientSecret` directly in `app-config.yaml`. Use environment variables (`${AUTH_GITHUB_CLIENT_ID}` and `${AUTH_GITHUB_CLIENT_SECRET}`) and keep secrets out of version control.

Set the environment variables before starting:

```sh
export AUTH_GITHUB_CLIENT_ID=your_client_id
export AUTH_GITHUB_CLIENT_SECRET=your_client_secret
export GITHUB_TOKEN=your_pat_token
yarn start
```

#### 3. How it works

- **Backend**: `@backstage/plugin-auth-backend` and `@backstage/plugin-auth-backend-module-github-provider` are registered in `packages/backend/src/index.ts`. They handle the OAuth callback and issue a Backstage session token.
- **Frontend**: `packages/app/src/App.tsx` renders a `SignInPage` wired to `githubAuthApiRef`, which initiates the GitHub OAuth flow when the user lands on the portal.
- **Sign-in resolver**: `usernameMatchingUserEntityName` maps the authenticated GitHub username to a `User` entity in the software catalog. Ensure your catalog contains matching `User` entities (see `examples/org.yaml`).

#### Optional settings

```yaml
auth:
  providers:
    github:
      development:
        # Uncomment for GitHub Enterprise
        # enterpriseInstanceUrl: ${AUTH_GITHUB_ENTERPRISE_INSTANCE_URL}

        # Uncomment to set how long a user session lasts
        # sessionDuration: { hours: 24 }
```

---

### Guest Provider (Development Only)

A `guest` provider is also enabled for convenience during local development:

```yaml
auth:
  providers:
    guest: {}
```

This allows unauthenticated access and should **not** be enabled in production.

---

### Catalog

The software catalog is configured to allow `Component`, `System`, `API`, `Resource`, and `Location` entity kinds. Example data is loaded from the `examples/` directory:

```yaml
catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location]
  locations:
    - type: file
      target: ../../examples/entities.yaml
    - type: file
      target: ../../examples/template/template.yaml
      rules:
        - allow: [Template]
    - type: file
      target: ../../examples/org.yaml
      rules:
        - allow: [User, Group]
```

---

### GitHub org import

Members and teams of the [idPlatformKit](https://github.com/idPlatformKit) GitHub org are imported into the catalog as `User` and `Group` entities by `@backstage/plugin-catalog-backend-module-github-org`. Imported users are what the GitHub sign-in resolver (`usernameMatchingUserEntityName`) matches against, so nobody has to be declared by hand in `examples/org.yaml`.

```yaml
catalog:
  providers:
    githubOrg:
      id: development
      githubUrl: https://github.com
      orgs: ['idPlatformKit']
      schedule:
        initialDelay: { seconds: 5 }
        frequency: { hours: 1 }
        timeout: { minutes: 50 }
```

It authenticates with the `integrations.github` token (`GITHUB_TOKEN`), which needs the `read:org`, `read:user` and `user:email` scopes. With an expired or revoked token the import fails in the backend logs with `refresh failed, HttpError: Bad credentials`, and the catalog has no GitHub users.

**Signing in right after startup fails.** The development catalog is in-memory (`better-sqlite3`, `:memory:`), so it starts empty on every restart and GitHub users only exist once the first import has run. Signing in before that fails with *"Failed to sign-in, unable to resolve user identity"*. This happened with the initial 30-second `initialDelay`. It is now 5 seconds, and the import itself takes under a second. If it still happens, wait for `Committed 1 GitHub users` in the backend logs and retry.

A user declared both in `examples/org.yaml` and in the GitHub org is reported as a conflict (`detected conflicting entityRef user:default/<name>`): the GitHub import is the source of truth, so don't duplicate users in the example file.

---

### Software Templates

#### New Tenant (`templates/tenant/`)

Self-service entry point to the [IdPlatformKit Orchestrator](https://github.com/idPlatformKit/Orchestrator): a developer fills in a form, and the template opens a pull request adding a `Tenant` claim to [idPlatformKit/instances](https://github.com/idPlatformKit/instances). From there the platform's GitOps flow takes over: CI validates the claim against the XRDs, and once merged, Argo CD syncs it and Crossplane provisions the namespace.

| Field | Becomes |
|---|---|
| Name | `metadata.name`, which is also the namespace name |
| Owner group | `spec.ownerGroup`. Picked among the `Group` entities imported from GitHub teams (filtered on the `github.com/team-slug` annotation) |
| OpenBao secrets namespace + ServiceAccount | `spec.vault`, only when enabled |

The pull request is opened **with the developer's own GitHub identity**, not a shared portal token: the `RepoUrlPicker` requests the user's GitHub OAuth token with the extra `public_repo` scope (`requestUserCredentials`), and `publish:github:pull-request` uses it. GitHub then shows who asked for the tenant.

**The GitHub org must approve the portal's OAuth App.** GitHub orgs restrict OAuth App access by default, so the first run failed on the first write, before anything was created:

```
Pull request creation failed; caused by HttpError: Although you appear to have the correct authorization
credentials, the `idPlatformKit` organization has enabled OAuth App access restrictions ...
```

An org owner has to grant access once: open `https://github.com/settings/connections/applications/<client id>` and click **Grant** next to the org under *Organization access*. The user's token stays valid, so no new sign-in is needed. Granting access to this one app is preferable to lifting the org's restrictions.

Verified end to end on the local kind cluster ([Orchestrator](https://github.com/idPlatformKit/Orchestrator) `make local-up-gitops`):

1. The template, run in the browser, opened [idPlatformKit/instances#1](https://github.com/idPlatformKit/instances/pull/1). It was authored by the signed-in user and adds `tenants/payments.yaml` (owner `checkout-engineers`, OpenBao enabled).
2. The instances CI validated the claim against the XRDs in 11 seconds.
3. After the merge, Argo CD applied the claim, and about 3 minutes later the `payments` Tenant was `Ready`: namespace, quota, limits, a default-deny NetworkPolicy, a `RoleBinding` granting `Group/checkout-engineers` the `edit` ClusterRole, and the OpenBao namespace, mount, policy and Kubernetes auth role.

Before that, a scaffolder dry run (`POST /api/scaffolder/v2/dry-run`) checked both variants (with and without OpenBao). Both produce a claim that passes `crossplane resource validate`.

The template is registered in `catalog.locations` in `app-config.yaml`. If your `app-config.local.yaml` also defines `catalog.locations`, it **replaces** the list instead of extending it (arrays aren't merged across config files), and the template won't show up.

---

#### New Postgres database (`templates/postgres-database/`)

The model for adding a service to an existing tenant:

1. **Pick the tenant.** `OwnedEntityPicker` limits the list to `Resource` entities of type `tenant` owned by your teams.
2. **Describe the service.** Here, a database name.
3. **Look it up.** `catalog:fetch` reads the tenant entity, to reuse its namespace (`metadata.title`) and its owner.
4. **Open the pull request.** It goes to [idPlatformKit/instances](https://github.com/idPlatformKit/instances) with your own GitHub identity, and adds two files:
   - `databases/<tenant>/<name>.yaml`, a `PostgresDatabase` claim in the tenant's namespace. The connection details land in the `<name>-conn` Secret.
   - `catalog/postgres-<tenant>-<name>.yaml`, a `Resource` entity of type `database`, owned by the tenant's team and `dependencyOf` the tenant entity. It shows next to the tenant in the catalog graph, and its Kubernetes tab lists the database's objects.

Several databases per tenant are possible. On the shared Postgres server, each one is `<tenant>_<name>`.

Verified end to end on kind:

1. Run from the browser on `tenant-payments`, the template opened [idPlatformKit/instances#4](https://github.com/idPlatformKit/instances/pull/4), authored by the signed-in user, adding `databases/payments/orders.yaml` and `catalog/postgres-payments-orders.yaml`. The instances CI validated it.
2. After the merge, Argo CD applied the claim, and Crossplane created the `payments_orders` role and database. A login with the `orders-conn` Secret's credentials could create and write a table.
3. In the catalog, `postgres-payments-orders` is owned by `checkout-engineers` and linked both ways: `dependencyOf → tenant-payments` on the database, `dependsOn → postgres-payments-orders` on the tenant. Its Kubernetes tab lists the `PostgresDatabase`, `Role` and `Database`, with no errors.

Before that, a scaffolder dry run checked the generated files, and the claim passes `crossplane resource validate`.

---

### Kubernetes: each tenant's resources

Every tenant has a `Resource` entity of type `tenant` (for example `tenant-payments`), owned by its GitHub team. Its **Kubernetes** tab lists everything Crossplane composed for it:
- the `Tenant` itself;
- its `ResourceQuota`, `LimitRange`, `NetworkPolicy` and `RoleBinding`;
- the OpenBao resources: `VaultNamespace`, `Mount`, `Policy`, auth `Backend`, `AuthBackendConfig` and `AuthBackendRole`.

Database entities (type `database`) get the same tab, listing their `PostgresDatabase` and its `Role` and `Database`.

How the pieces fit:

- **Entities**: they live in [idPlatformKit/instances](https://github.com/idPlatformKit/instances) under `catalog/<tenant>.yaml`, next to the claim in `tenants/<tenant>.yaml`. The New Tenant template opens both files in the same pull request. The `github` catalog provider (`@backstage/plugin-catalog-backend-module-github`) discovers `catalog/*.yaml` on `main` every 5 minutes.
- **Selection**: each entity carries `backstage.io/kubernetes-label-selector: crossplane.io/composite=<tenant>`, a label Crossplane puts on the Tenant and on everything it composes. There's no namespace annotation: the `Tenant` is cluster-scoped, so a namespaced lookup would miss it.
- **Custom resources**: NetworkPolicies, RoleBindings, the platform's XRs and the Vault managed resources aren't in the plugin's default object types, so they're listed in `kubernetes.customResources`.
- **Cluster access**: the local kind cluster from [Orchestrator](https://github.com/idPlatformKit/Orchestrator) is read through its read-only `backstage-reader` ServiceAccount, which has no access to Secrets. Export its URL and token before `yarn start`:

  ```sh
  eval "$(make -C ../Orchestrator -s backstage-token)"   # sets K8S_CLUSTER_URL and K8S_CLUSTER_TOKEN
  yarn start
  ```

  `skipTLSVerify: true` is there because kind's API server uses a self-signed certificate. That's local only.

Verified against the kind cluster, first through the backend API (`POST /api/kubernetes/services/tenant-payments` returned the 11 objects listed above, with no errors), then in the browser, where the Kubernetes tab of `tenant-payments` shows all of them. A scaffolder dry run of the template produces the entity file next to the claim.

---

### TechDocs

TechDocs are built locally using Docker:

```yaml
techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
  publisher:
    type: 'local'
```

For production, switch to an external builder and a cloud storage publisher (GCS or S3). See the [TechDocs deployment guide](https://backstage.io/docs/features/techdocs/how-to-guides#how-to-migrate-from-techdocs-basic-to-recommended-deployment-approach).

---

### Permissions

The permission framework is enabled by default:

```yaml
permission:
  enabled: true
```

The backend loads `@backstage/plugin-permission-backend-module-allow-all-policy`, which grants access to all users. Replace this with a custom policy for production use.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `AUTH_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `GITHUB_TOKEN` | GitHub PAT for API integrations (catalog, scaffolder) |
| `BACKEND_SECRET` | Shared secret for backend service-to-service auth (production) |

---

## Project Structure

```
portal/
├── app-config.yaml          # Main configuration
├── app-config.production.yaml  # Production overrides
├── packages/
│   ├── app/                 # Frontend (React, Backstage new frontend system)
│   └── backend/             # Backend (Backstage backend-defaults)
└── examples/                # Sample catalog entities and templates
```
