import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {CORE_API_URL} from "@/lib/client-config";

interface User {
    id: string | number;
    first_name: string;
    last_name: string;
    email: string;
    permissions: string[];

    [key: string]: any; // For any additional user properties
}

interface AuthState {
    // State
    user: User | null;
    loading: boolean;
    error: string | null;

    // Actions
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    hasPermission: (permission: string) => boolean;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            loading: false,
            error: null,

            // Login action
            login: async (username: string, password: string) => {
                set({loading: true, error: null});

                try {
                    const formData = new FormData();
                    formData.append('username', username);
                    formData.append('password', password);

                    const response = await fetch(`${CORE_API_URL}/v1/auth/login`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include', // Important: this tells the browser to send and store cookies
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Login failed');
                    }

                    const response_me = await fetch(`${CORE_API_URL}/v1/auth/me`, {
                        method: 'GET',
                        credentials: 'include',
                    });

                    if (!response_me.ok) {
                        const errorData = await response_me.json();
                        throw new Error(errorData.message || 'User loading failed');
                    }

                    const responseData = await response_me.json();
                    console.log('Response data:', responseData);
                    const userData = responseData.data;
                    console.log('User data:', userData);

                    set({
                        user: userData,
                        loading: false,
                        error: null
                    });

                    return true;
                } catch (err) {
                    set({
                        user: null,
                        loading: false,
                        error: err.message || 'An error occurred during login'
                    });
                    return false;
                }
            },

            // Refresh token action
            refreshToken: async () => {
                try {
                    const response = await fetch(`${CORE_API_URL}/v1/auth/refresh`, {
                        method: 'POST',
                        credentials: 'include',
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to refresh token');
                    }

                    // Update user data after successful token refresh
                    const userResponse = await fetch(`${CORE_API_URL}/v1/auth/me`, {
                        method: 'GET',
                        credentials: 'include',
                    });

                    if (!userResponse.ok) {
                        throw new Error('Failed to fetch user data');
                    }

                    const userData = await userResponse.json();
                    set({
                        user: userData.data,
                        error: null,
                        loading: false
                    });
                    return true;
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    set({
                        user: null,
                        loading: false,
                        error: 'Session expired. Please login again.'
                    });
                    return false;
                }
            },

            // Logout action
            logout: async () => {
                try {
                    // Optional: Call logout endpoint if you have one
                    await fetch(`${CORE_API_URL}/v1/auth/logout`, {
                        method: 'POST',
                        credentials: 'include',
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    // Clear user state regardless of API call result
                    set({
                        user: null,
                        error: null,
                        loading: false,
                    });
                }
            },

            // Check if user has permission
            hasPermission: (permission) => {
                const user = get().user;
                return user ? user.permissions.includes(permission) : false;
            },

            // Clear error message
            clearError: () => set({error: null}),
        }),
        {
            name: 'auth-storage', // name of the item in the storage
            partialize: (state) => ({
                user: state.user
            }), // Only store the user field
        }
    )
);

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
    return !!useAuthStore.getState().user;
};