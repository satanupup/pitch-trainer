class PitchScoring {
    constructor() {
        this.initializeProperties();
    }
    
    // 初始化或重置所有屬性
    initializeProperties() {
        this.score = 0;
        this.totalNotes = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.accuracyHistory = [];
    }
    
    evaluatePitch(userPitch, targetPitch) {
        if (!targetPitch) return null;
        const deviation = Math.abs(userPitch - targetPitch);
        const accuracy = Math.max(0, 100 - (deviation * 10));
        this.score += accuracy;
        this.totalNotes++;
        this.accuracyHistory.push(accuracy);
        if (this.accuracyHistory.length > 100) {
            this.accuracyHistory.shift();
        }
        if (accuracy >= 80) {
            this.currentStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
        } else {
            this.currentStreak = 0;
        }
        return accuracy;
    }
    getAverageScore() {
        return this.totalNotes > 0 ? Math.round(this.score / this.totalNotes) : 0;
    }
    getRecentAccuracy() {
        if (this.accuracyHistory.length === 0) return 0;
        const recent = this.accuracyHistory.slice(-10);
        return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
    }
    reset() {
        this.initializeProperties();
        return this; // 支持鏈式調用
    }
}

export { PitchScoring }; 
