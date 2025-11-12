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
            title="Spirit Messenger"
        >
            <div className="flex flex-col h-full gap-8 mt-8">
                {/* Window Content */}
                <div className="flex-1 flex flex-col items-center">
                    <div className="text-center mb-6">
                        <h1
                            className="!text-2xl font-ms font-bold text-[#0066CC] mb-2 font-msn">Create Account</h1>
                        <p
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                            className="text-md text-gray-600">Join Spirit Messenger today</p>
                    </div>

                    {generalError && (
                        <div className="mb-4 p-2 bg-[#FFE6E6] border border-[#FF9999] rounded text-sm text-red-700">
                            {generalError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold text-[#24245D] mb-1">
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
                                    } rounded text-md focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Choose a username"
                                disabled={isLoading}
                            />
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-[#24245D] mb-1">
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
                                    } rounded text-md focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="example@hotmail.com"
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-[#24245D] mb-1">
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
                                    } rounded text-md focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Create a password"
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-bold text-[#24245D] mb-1">
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
                                    } rounded text-md focus:outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]`}
                                placeholder="Confirm your password"
                                disabled={isLoading}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="!px-5 !py-2 !bg-white border-2 self-center my-6 !border-[#003c74] rounded shadow-md hover:from-[#FAFAFA] hover:to-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed !bg-gradient-to-t from-[#CCE4FF]"
                            style={{
                                boxShadow: '0 -1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px #E2A42E, inset 1px 1px 0 rgba(255,255,255,0.8), inset -1px -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3)'
                            }}
                        >
                            <span className="text-md font-bold text-[#11207e]">
                                {isLoading ? 'Creating account...' : 'Create Account'}
                            </span>
                        </button>
                    </form>
                </div>

                <div className="flex flex-col py-6 border-t border-gray-300 items-center">
                    <label
                        className="text-[#2F22DA] mb-2 hover:text-[#0033AA]"
                    >
                        Already have an account?
                    </label>
                    <button
                        type="submit"
                        onClick={onSwitchToSignIn}
                        className="!px-5 !py-2 !bg-white border-2 !border-[#003c74] rounded shadow-md hover:from-[#FAFAFA] hover:to-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed !bg-gradient-to-t from-[#CCE4FF]"
                        style={{
                            boxShadow: '0 -1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px #E2A42E, inset 1px 1px 0 rgba(255,255,255,0.8), inset -1px -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3)'
                        }}
                    >
                        <span className="text-md font-bold text-[#11207e]">
                            Sign in here
                        </span>
                    </button>
                </div>
            </div>
        </Layout>
    );
}
