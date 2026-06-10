# AiGate v2.0 — 开源项目分析与架构方案

## 1. 三个开源项目定位速览

| 项目 | 技术栈 | 核心定位 | 与 AiGate 的关系 |
|------|--------|----------|-----------------|
| **CLIProxyAPI** | Go (net/http) | CLI 工具的 AI API 代理，支持 OAuth 多账号负载均衡 | 网关转发核心可直接参考 |
| **new-api** | Go + Gin + React | 大模型网关 + 资产管理系统（One API 二开）| 网关 + 管理后台 + 计费体系可深度参考 |
| **ruoyi-ai** | Java Spring Boot + Langchain4j + Vue | 企业级 AI 助手平台（RAG + Agent + MCP + 工作流）| RAG/Agent/MCP 业务逻辑可参考 |
