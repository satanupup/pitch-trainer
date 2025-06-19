function uploadLimiter(req, res, next) {
    // TODO: 速率限制邏輯
    next();
}

module.exports = { uploadLimiter };
