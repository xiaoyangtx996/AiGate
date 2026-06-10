/**
 * PM2 生产部署配置示例
 *
 * 前置步骤：
 *   pnpm install --frozen-lockfile
 *   pnpm build
 *   pnpm dlx drizzle-kit migrate
 *
 * 启动：pm2 start ecosystem.config.cjs
 * 重载：pm2 reload ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'aigate',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
      },
    },
  ],
}
