const express = require('express');
const multer = require('multer');
const importRoutes = require('./routes/importRoutes');
const { initDB } = require('./db/database');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/imports', importRoutes);

app.use((err, req, res, next) => {
  console.error('错误:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制（最大 10MB）'
      });
    }
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

const startApp = async () => {
  try {
    await initDB();
    console.log('数据库初始化成功');
    return app;
  } catch (error) {
    console.error('应用启动失败:', error);
    throw error;
  }
};

module.exports = { app, startApp };
