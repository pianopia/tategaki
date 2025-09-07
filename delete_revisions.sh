#!/bin/bash
REVISIONS=$(gcloud run revisions list --service countdown --region asia-east1 --format="value(name)")

# 各リビジョンを削除（現在使用中のものは除く）
for REVISION in $REVISIONS; do
  echo "削除中: $REVISION"
  gcloud run revisions delete $REVISION --region=asia-east1 --quiet || echo "$REVISION は削除できませんでした"
done