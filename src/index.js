const { app, startApp } = require('./app');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await startApp();
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
