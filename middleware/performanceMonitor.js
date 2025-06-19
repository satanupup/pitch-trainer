function performanceMonitor(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[📊] ${req.method} ${req.path} - ${duration}ms`);
        if (duration > 5000) {
            console.warn(`[⚠️] 慢查詢警告: ${req.path} 耗時 ${duration}ms`);
        }
    });
    next();
}

module.exports = { performanceMonitor };
