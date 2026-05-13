/**
 * NotificationService
 * 
 * A simple Pub/Sub service for application-wide notifications.
 * Allows non-component code (like API hooks or utility functions) to trigger UI toasts.
 */
class NotificationService {
    listeners = new Set();

    /**
     * Subscribe to notifications
     * @param {Function} listener - Callback function(notification)
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Trigger a notification
     * @param {string} message - Message to display
     * @param {string} type - 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration - MS to show the toast
     */
    notify(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration
        };
        this.listeners.forEach(listener => listener(notification));
    }

    success(message, duration) {
        this.notify(message, 'success', duration);
    }

    error(message, duration) {
        this.notify(message, 'error', duration);
    }

    info(message, duration) {
        this.notify(message, 'info', duration);
    }

    warning(message, duration) {
        this.notify(message, 'warning', duration);
    }
}

export const notificationService = new NotificationService();
export default notificationService;
