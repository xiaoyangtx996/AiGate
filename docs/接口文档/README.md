# 接口文档

本目录为 AiGate **HTTP 接口文档**的唯一维护位置。后续新增/变更接口，请同步更新这里（不要再散落在仓库根或其他目录）。

## 目录约定

| 文件 | 说明 |
|---|---|
| [后端接口.md](./后端接口.md) | 管理 API + 网关接口说明（中文） |
| [aigate-backend.reqable.postman_collection.json](./aigate-backend.reqable.postman_collection.json) | Reqable / Postman 可导入集合（中文） |

## 更新规则

1. **先改代码契约，再改文档**：路径、请求体、鉴权、错误码以 `backend/` 实现为准。
2. **中文描述**：接口名、分组名、说明文档一律中文。
3. **双份同步**：改完 Markdown 后，同步更新 Reqable 集合 JSON（或导出覆盖本目录文件）。
4. **禁止写入密钥**：厂商 Key、JWT、员工 API Key 明文不得提交进本目录。
5. **按里程碑扩展**：可新增如 `后端-审计与告警.md`、`前端约定.md`，并在本 README 表格登记。

## 当前基址（本地）

- 管理 API：`http://127.0.0.1:8080`
- 网关：`http://127.0.0.1:8081`
