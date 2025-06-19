class AudioBuffer {
    constructor(maxSize = 1000) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    add(data) {
        this.buffer.push(data);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    getAverage() {
        if (this.buffer.length === 0) return 0;
        return this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    }
    clear() {
        this.buffer = [];
    }
}
export { AudioBuffer }; 