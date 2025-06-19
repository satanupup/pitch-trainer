class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }
    startLoading(id, message = '載入中...') {
        this.loadingStates.set(id, { message, startTime: Date.now() });
        this.updateUI(id);
    }
    stopLoading(id) {
        this.loadingStates.delete(id);
        this.updateUI(id);
    }
    updateUI(id) {
        const loadingState = this.loadingStates.get(id);
        const element = document.getElementById('loading-indicator');
        const textElement = document.getElementById('loading-text');
        if (element && textElement) {
            if (loadingState) {
                textElement.textContent = loadingState.message;
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }
}
export { LoadingManager }; 