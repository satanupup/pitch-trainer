class ErrorHandler {
    static async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                console.warn(`重試 ${i + 1}/${maxRetries}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    static showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('toast-message', 'error');
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.classList.add('hide');
            setTimeout(() => errorDiv.remove(), 300);
        }, duration);
    }
    static showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.classList.add('toast-message', 'success');
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => {
            successDiv.classList.add('hide');
            setTimeout(() => successDiv.remove(), 300);
        }, duration);
    }
}

export { ErrorHandler }; 