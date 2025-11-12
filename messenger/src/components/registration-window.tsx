import { useState, FormEvent } from 'react';
import { Layout } from './layout';

interface RegistrationWindowProps {
    onRegister: (username: string, email: string, password: string) => Promise<void>;
    onSwitchToSignIn: () => void;
}

export function RegistrationWindow({ onRegister, onSwitchToSignIn }: RegistrationWindowProps) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{
        username?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    const validateForm = (): boolean => {
        const newErrors: {
            username?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
        } = {};

        // Username validation
        if (!username.trim()) {
            newErrors.username = 'Username is required';
        } else if (username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (username.length > 20) {
            newErrors.username = 'Username must be less than 20 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
        }

        // Email validation
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        } else if (password.length > 50) {
            newErrors.password = 'Password must be less than 50 characters';
        }

        // Confirm password validation
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setGeneralError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await onRegister(username, email, password);
        } catch (error) {
            setGeneralError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout
            title="MSN Messenger - Registration"
            icon={
                <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center text-[#0066CC] text-xs font-bold">
                    M
                </div>
            }
        >
            <div className="flex items-center justify-center min-h-full bg-[#5A7EBF]">
                <div className="w-[400px] bg-[#ECE9D8] rounded-lg shadow-lg overflow-hidden border-2 border-[#0066CC]">
                    <div className="p-6">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-[#0066CC] mb-2">Create Account</h1>
                        <p className="text-xs text-gray-600">Join MSN Messenger today</p>
                    </div>

                    {generalError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-xs text-red-700">
                            {generalError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-xs font-bold mb-1 text-gray-700">
                                Username:
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (errors.username) setErrors({ ...errors, username: undefined });
                                }}
                                className={`w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-400'
                                    } rounded text-xs focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Choose a username"
                                disabled={isLoading}
                            />
                            {errors.username && (
                                <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold mb-1 text-gray-700">
                                Email address:
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors({ ...errors, email: undefined });
                                }}
                                className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-400'
                                    } rounded text-xs focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="example@hotmail.com"
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold mb-1 text-gray-700">
                                Password:
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors({ ...errors, password: undefined });
                                }}
                                className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-400'
                                    } rounded text-xs focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Create a password"
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-bold mb-1 text-gray-700">
                                Confirm Password:
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                                }}
                                className={`w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400'
                                    } rounded text-xs focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Confirm your password"
                                disabled={isLoading}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#0066CC] hover:bg-[#0055AA] disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded text-xs transition-colors duration-150 shadow-sm"
                        >
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-gray-300 text-center">
                        <p className="text-xs text-gray-600 mb-2">
                            Already have an account?
                        </p>
                        <button
                            onClick={onSwitchToSignIn}
                            disabled={isLoading}
                            className="text-[#0066CC] hover:text-[#0055AA] font-bold text-xs underline disabled:text-gray-400"
                        >
                            Sign in here
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
