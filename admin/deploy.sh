PROJECT_ID="frash-447004"

gcloud config set project $PROJECT_ID

gcloud artifacts repositories create tategaki-admin \
    --repository-format=docker \
    --location=asia-east1 \
    --description="Admin Docker images" || true

# ビルド
docker buildx build -t asia-east1-docker.pkg.dev/$PROJECT_ID/tategaki/tategaki-admin:latest --platform linux/amd64 . || exit 1

# プッシュ
docker push asia-east1-docker.pkg.dev/$PROJECT_ID/tategaki/tategaki-admin:latest || exit 1

gcloud run deploy tategaki-admin \
  --image asia-east1-docker.pkg.dev/$PROJECT_ID/tategaki/tategaki-admin:latest \
  --platform managed \
  --set-env-vars NODE_ENV=production \
  --region=asia-east1

gcloud run services update-traffic tategaki-admin --to-latest --region=asia-east1
