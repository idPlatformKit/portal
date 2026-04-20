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
