# 副业避坑雷达 / SideHustle Radar

微信小程序 AppID：`wx30321379334ec662`

这是「副业避坑雷达」的项目仓库，包含：

- `miniprogram/`：微信小程序端源码。
- `server/`：后端 API，首版使用本地 JSON 数据，无数据库依赖。
- `data/`：项目风险卡和风险关键词种子数据。
- `docs/`：产品、审核、系统设计和开发拆解文档。
- `deploy/`：服务器部署、systemd、Nginx 子路径配置。

## 本地运行 API

```bash
npm test
npm run validate:data
SIDEHUSTLE_DB_PATH=data/sidehustle-radar.sqlite3 python3 server/seed_db.py --db data/sidehustle-radar.sqlite3 --data-dir data
PORT=18110 PUBLIC_BASE_PATH=/sidehustle-radar-api SIDEHUSTLE_DB_PATH=data/sidehustle-radar.sqlite3 python3 server/app.py
```

健康检查：

```bash
curl http://127.0.0.1:18110/health
```

## 线上部署路径

服务器：`ubuntu@111.229.10.122`

现有域名子路径：

- API：`https://api2.hometodo.top/sidehustle-radar-api/`

部署采用独立 systemd 服务和独立 Nginx location：

- 服务名：`sidehustle-radar-api.service`
- 端口：`127.0.0.1:18110`
- 部署目录：`/opt/sidehustle-radar`

这个部署不会改动根路径和已有服务。

## CI/CD

- CI：GitHub Actions 在 push/PR 时运行数据校验和后端测试。
- CD：服务器安装 systemd timer，定时从 GitHub main 分支拉取更新，只有检测到新提交时才重启独立 API 服务。

之所以采用服务器拉取，是为了避免把服务器 SSH 私钥配置到 GitHub Secrets。

## 数据库

首版使用 SQLite：

- 线上路径：`/var/lib/sidehustle-radar/sidehustle-radar.sqlite3`
- 种子数据：`data/projects.seed.json`、`data/risk-keywords.seed.json`
- 部署时执行 upsert，不会删除线上已有数据。
