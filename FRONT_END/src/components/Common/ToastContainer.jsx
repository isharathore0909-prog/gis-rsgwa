import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import './ToastContainer.css';

/**
 * ToastContainer
 * 
 * Listens to the notificationService and renders floating toast messages.
 */
const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        // Subscribe to notifications
        const unsubscribe = notificationService.subscribe((newToast) => {
            setToasts(prev => [...prev, newToast]);

            // Auto-remove after duration
            setTimeout(() => {
                removeToast(newToast.id);
            }, newToast.duration || 5000);
        });

        return unsubscribe;
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="toast-icon success" />;
            case 'error': return <AlertCircle size={20} className="toast-icon error" />;
            case 'warning': return <AlertTriangle size={20} className="toast-icon warning" />;
            default: return <Info size={20} className="toast-icon info" />;
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast-message toast-${toast.type} animated-toast`}>
                    <div className="toast-content">
                        {getIcon(toast.type)}
                        <span className="toast-text">{toast.message}</span>
                    </div>
                    <button className="toast-close" onClick={() => removeToast(toast.id)}>
                        <X size={16} />
                    </button>
                    <div
                        className="toast-progress"
                        style={{ animationDuration: `${toast.duration || 5000}ms` }}
                    />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
