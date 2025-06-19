function errorHandler(error, req, res, next) {
    console.error('[-] 伺服器錯誤:', error);
    if (error.code === 'ENOENT') {
        return res.status(404).json({ error: '檔案不存在' });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '檔案過大' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: '檔案數量超出限制' });
    }
    res.status(500).json({ error: '伺服器內部錯誤' });
}

module.exports = { errorHandler };
