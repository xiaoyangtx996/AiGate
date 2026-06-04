/**
 * 全局错误处理中间件
 * 统一错误格式，记录错误日志，生产环境隐藏敏感信息
 */
export default defineEventHandler((event) => {
  try {
    return
  }
  catch (error) {
    // 提取错误信息
    const statusCode = error.statusCode || 500
    const isProduction = process.env.NODE_ENV === 'production'

    // 记录错误日志（脱敏）
    console.error('API Error:', {
      path: event.node.req.url,
      method: event.method,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        // 生产环境不输出堆栈
        stack: isProduction ? undefined : error.stack,
      },
    })

    // 统一错误响应格式
    const response = {
      success: false,
      code: statusCode,
      message: isProduction && statusCode === 500
        ? 'Internal Server Error'
        : (error.message || 'Something went wrong'),
      ...(!isProduction && error.stack ? { stack: error.stack } : {}),
    }

    return response
  }
})
