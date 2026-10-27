#!/usr/bin/env bash
# Setup một lần cho deploy Cloud Run từ GitHub Actions (.github/workflows/deploy.yml).
# Tạo: Artifact Registry repo, service account deployer, Workload Identity Federation (OIDC)
# giới hạn đúng repo + branch main. Chạy lại an toàn (idempotent).
# Yêu cầu: gcloud đã login với quyền Owner (hoặc IAM Admin + WIF Admin) trên project.
# Xem docs/06-live-deployment.md §0.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-zvas-ai-image}"
REGION="${REGION:-us-west1}"
AR_REPO="${AR_REPO:-app}"
GITHUB_REPO="${GITHUB_REPO:-thanhnghiep1208/zVas-AI-Image}"
DEPLOYER_SA_NAME="${DEPLOYER_SA_NAME:-github-deployer}"
POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-github-oidc}"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
DEPLOYER_SA="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
# Runtime SA của Cloud Run (compute default) — deployer cần actAs để tạo revision.
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

echo "==> Project $PROJECT_ID ($PROJECT_NUMBER), repo GitHub $GITHUB_REPO"

echo "==> Bật API cần thiết"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project "$PROJECT_ID"

echo "==> Artifact Registry: $REGION/$AR_REPO"
if ! gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location "$REGION" \
    --description "Docker images cho Cloud Run (GitHub Actions)" \
    --project "$PROJECT_ID"
fi

echo "==> Service account deployer: $DEPLOYER_SA"
if ! gcloud iam service-accounts describe "$DEPLOYER_SA" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOYER_SA_NAME" \
    --display-name "GitHub Actions deployer" \
    --project "$PROJECT_ID"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$DEPLOYER_SA" \
  --role roles/run.admin \
  --condition=None >/dev/null

gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" \
  --location "$REGION" \
  --project "$PROJECT_ID" \
  --member "serviceAccount:$DEPLOYER_SA" \
  --role roles/artifactregistry.writer >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project "$PROJECT_ID" \
  --member "serviceAccount:$DEPLOYER_SA" \
  --role roles/iam.serviceAccountUser >/dev/null

echo "==> Workload Identity Pool: $POOL_ID"
if ! gcloud iam workload-identity-pools describe "$POOL_ID" --location global --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location global \
    --display-name "GitHub Actions" \
    --project "$PROJECT_ID"
fi

# Chỉ token OIDC từ đúng repo + branch main mới đổi được credential.
ATTRIBUTE_CONDITION="assertion.repository == '${GITHUB_REPO}' && assertion.ref == 'refs/heads/main'"

echo "==> Workload Identity Provider: $PROVIDER_ID"
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --workload-identity-pool "$POOL_ID" --location global --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --workload-identity-pool "$POOL_ID" \
    --location global \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "$ATTRIBUTE_CONDITION" \
    --project "$PROJECT_ID"
else
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
    --workload-identity-pool "$POOL_ID" \
    --location global \
    --attribute-condition "$ATTRIBUTE_CONDITION" \
    --project "$PROJECT_ID" >/dev/null
fi

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}" >/dev/null

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

cat <<EOF

Xong. Cấu hình GitHub (Settings → Secrets and variables → Actions), hoặc chạy bằng gh CLI:

  gh secret set WIF_PROVIDER --repo $GITHUB_REPO --body '$WIF_PROVIDER'
  gh secret set WIF_SERVICE_ACCOUNT --repo $GITHUB_REPO --body '$DEPLOYER_SA'
  gh secret set FIREBASE_APPLET_CONFIG --repo $GITHUB_REPO < firebase-applet-config.json
  # tuỳ chọn — bật Sentry frontend trong bản build prod:
  # gh secret set VITE_SENTRY_DSN --repo $GITHUB_REPO --body '<dsn>'

  gh variable set GCP_PROJECT --repo $GITHUB_REPO --body '$PROJECT_ID'
  gh variable set GCP_REGION --repo $GITHUB_REPO --body '$REGION'
  gh variable set CLOUD_RUN_SERVICE --repo $GITHUB_REPO --body 'ai-image-zvas'
  gh variable set AR_REPO --repo $GITHUB_REPO --body '$AR_REPO'

Sau đó tạo Environment "production" trong repo (Settings → Environments).
EOF
