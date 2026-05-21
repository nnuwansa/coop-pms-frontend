import axios, {AxiosError, AxiosInstance, InternalAxiosRequestConfig} from 'axios';

import {CORE_API_URL} from '@/lib/client-config';
import {useAuthStore} from "@/store/auth-store";

// Create axios instance
export const api = axios.create({
    baseURL: CORE_API_URL,
    withCredentials: true,
});

// Centralized refresh state to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

// Process the queue of failed requests
const processQueue = (success: boolean) => {
    failedQueue.forEach(promise => {
        if (success) {
            promise.resolve(true);
        } else {
            promise.reject('Token refresh failed');
        }
    });

    failedQueue = [];
};

// Setup axios interceptors for automatic token refresh
export function setupAxiosInterceptors(axios: AxiosInstance): void {
    // Response interceptor for token refresh
    axios.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            // Handle only if it's an auth error and we haven't retried yet
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                console.log('Found 401, refreshing...');

                // If already refreshing, queue this request
                if (isRefreshing) {
                    try {
                        await new Promise((resolve, reject) => {
                            failedQueue.push({resolve, reject});
                        });
                        // Once the token is refreshed, retry the original request
                        return axios(originalRequest);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }

                // Set refreshing flag
                isRefreshing = true;

                try {
                    // Use the auth store's refreshToken function
                    const success = await useAuthStore.getState().refreshToken();

                    isRefreshing = false;
                    processQueue(success);

                    if (success) {
                        // Retry the original request
                        return axios(originalRequest);
                    } else {
                        // If refresh failed, redirect to sign-in
                        if (typeof window !== 'undefined') {
                            window.location.href = '/sign-in';
                        }
                        throw new Error('Token refresh failed');
                    }
                } catch (refreshError) {
                    isRefreshing = false;
                    processQueue(false);

                    // Handle refresh error
                    if (typeof window !== 'undefined') {
                        window.location.href = '/sign-in';
                    }
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
}

// Initialize the interceptors
setupAxiosInterceptors(api);

// Export the configured axios instance
export default api;