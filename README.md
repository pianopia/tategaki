## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Deploy
```bash
# artifact registry の作成
gcloud artifacts repositories create <プロジェクト名> \
    --repository-format=docker \
    --location=asia-east1 \
    --description="Frontend Docker images"

# artifact registry の認証
gcloud auth configure-docker asia-east1-docker.pkg.dev

# ビルド
docker buildx build -t asia-east1-docker.pkg.dev/<プロジェクトID>/<プロジェクト名>/<プロジェクト名>:latest --platform linux/amd64 .

# プッシュ
docker push asia-east1-docker.pkg.dev/<プロジェクトID>/<プロジェクト名>/<プロジェクト名>:latest

gcloud run deploy <プロジェクト名> --image asia-east1-docker.pkg.dev/<プロジェクトID>/<プロジェクト名>/<プロジェクト名>:latest --platform managed --set-env-vars NODE_ENV=production --region=asia-east1

gcloud run services update-traffic <プロジェクト名> --to-latest --region=asia-east1

gcloud artifacts repositories delete <プロジェクト名> --location=asia-east1
```

## No Left Space
```bash
docker system df

docker system prune -a

docker system prune --volumes
```