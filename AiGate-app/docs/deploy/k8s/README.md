# AiGate Kubernetes 部署

本目录提供 AiGate 的 K8s 占位清单，适用于已有 PostgreSQL 与 Ingress 的集群。

## 前置条件

1. 将 `deployment.yaml` 中的 `ghcr.io/OWNER/REPO/aigate:latest` 替换为实际 GHCR 镜像地址
2. 创建 Secret（键名需与 `.env.example` 一致）：

```bash
kubectl create secret generic aigate-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=BETTER_AUTH_SECRET='your-secret-min-32-chars' \
  --from-literal=BETTER_AUTH_URL='https://aigate.example.com' \
  --from-literal=NODE_ENV='production' \
  --from-literal=SENTRY_DSN='https://...'
```

## 部署

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

## 验证

```bash
kubectl get pods -l app=aigate
kubectl get svc aigate
```

应用监听容器内 `:3000`。对外暴露请自行配置 Ingress 或 LoadBalancer，并将 `BETTER_AUTH_URL` 设为公网 HTTPS 地址。

更多环境变量说明见 [部署指南](../README.md) 与 [Secrets 配置](../SECRETS.md)。
