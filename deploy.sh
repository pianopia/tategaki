# ビルド
docker buildx build -t asia-east1-docker.pkg.dev/frash-447004/tategaki/tategaki:latest --platform linux/amd64 .

# プッシュ
docker push asia-east1-docker.pkg.dev/frash-447004/tategaki/tategaki:latest

gcloud run deploy tategaki --image asia-east1-docker.pkg.dev/frash-447004/tategaki/tategaki:latest --platform managed --set-env-vars NODE_ENV=production --region=asia-east1

gcloud run services update-traffic tategaki --to-latest --region=asia-east1