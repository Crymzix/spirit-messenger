import { useState, FormEvent, useEffect } from 'react';
import { Layout } from '../layout';

interface SignInWindowProps {
    onSignIn: (email: string, password: string) => Promise<void>;
    onSwitchToRegister: () => void;
}

const defaultProfilePictures = [
    '/default-profile-pictures/beach_chairs.png',
    '/default-profile-pictures/chess_pieces.png',
    '/default-profile-pictures/dirt_bike.png',
    '/default-profile-pictures/friendly_dog.png',
    '/default-profile-pictures/orange_daisy.png',
    '/default-profile-pictures/palm_trees.png',
    '/default-profile-pictures/rocket_launch.png',
    '/default-profile-pictures/rubber_ducky.png',
    '/default-profile-pictures/running_horses.png',
    '/default-profile-pictures/skateboarder.png',
    '/default-profile-pictures/soccer_ball.png',
];

export function SignInScreen({ onSignIn, onSwitchToRegister }: SignInWindowProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('Online');
    const [rememberMe, setRememberMe] = useState(true);
    const [rememberPassword, setRememberPassword] = useState(true);
    const [signInAutomatically, setSignInAutomatically] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % defaultProfilePictures.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setGeneralError('');

        if (!email.trim() || !password) {
            setGeneralError('Please enter your email and password');
            return;
        }

        setIsLoading(true);
        try {
            await onSignIn(email, password);
        } catch (error) {
            setGeneralError(error instanceof Error ? error.message : 'Sign in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title="Spirit Messenger">
            <div className="flex flex-col h-full gap-8 mt-8">
                {/* Window Content */}
                <div className="flex-1 flex flex-col items-center">
                    {generalError && (
                        <div className="mb-4 p-2 bg-[#FFE6E6] border border-[#FF9999] rounded text-sm text-red-700">
                            {generalError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className='flex flex-col'>
                        {/* Profile Image */}
                        <div className="flex justify-center mb-6">
                            <div className="w-44 h-44 rounded-lg border border-[#78859E] flex items-center bg-white justify-center overflow-hidden relative">
                                {defaultProfilePictures.map((image, index) => (
                                    <img
                                        key={image}
                                        src={image}
                                        alt="Profile"
                                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                                        style={{
                                            opacity: index === currentImageIndex ? 1 : 0,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Email Address */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-[#24245D] mb-1">
                                Email address:
                            </label>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-400 rounded text-md bg-white focus:outline-none focus:border-[#0055E5]"
                                    placeholder="person@passport.com"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-[#24245D] mb-1">
                                Password:
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-400 rounded text-md !bg-transparent focus:outline-none focus:border-[#0055E5]"
                                placeholder="********"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <label className="block text-sm font-bold text-[#24245D]">
                                Status:
                            </label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-2 py-1 !border-none !bg-transparent text-sm !text-[#24245D] !focus:outline-none !focus:border-none appearance-none pr-8 ![background-image:none] !focus:ring-0 !focus:ring-offset-0 !outline-none"
                                    disabled={isLoading}
                                >
                                    <option>Online</option>
                                    <option>Busy</option>
                                    <option>Be Right Back</option>
                                    <option>Away</option>
                                    <option>On The Phone</option>
                                    <option>Out To Lunch</option>
                                    <option>Appear Offline</option>
                                </select>
                                <svg
                                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                                    width="8"
                                    height="5"
                                    viewBox="0 0 8 5"
                                    fill="none"
                                >
                                    <path d="M0 0L4 5L8 0H0Z" fill="#24245D" />
                                </svg>
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-2 my-6">
                            <div className="flex items-center gap-2">
                                <input
                                    id="rememberMe"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 accent-[#0055E5]"
                                    disabled={isLoading}
                                />
                                <label htmlFor="rememberMe" className="text-sm text-[#24245D]">
                                    Remember Me
                                </label>
                                <label
                                    className="text-[#2F22DA] underline hover:text-[#0033AA] cursor-pointer ml-2"
                                >
                                    (Forget Me)
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="rememberPassword"
                                    type="checkbox"
                                    checked={rememberPassword}
                                    onChange={(e) => setRememberPassword(e.target.checked)}
                                    className="w-4 h-4 accent-[#0055E5]"
                                    disabled={isLoading}
                                />
                                <label htmlFor="rememberPassword" className="text-sm text-[#24245D]">
                                    Remember my Password
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="signInAuto"
                                    type="checkbox"
                                    checked={signInAutomatically}
                                    onChange={(e) => setSignInAutomatically(e.target.checked)}
                                    className="accent-[#0055E5]"
                                    disabled={isLoading}
                                />
                                <label htmlFor="signInAuto" className="text-sm text-[#24245D]">
                                    Sign me in automatically
                                </label>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <div className="flex justify-center my-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="!px-5 !py-2 !bg-white border-2 !border-[#003c74] rounded shadow-md hover:from-[#FAFAFA] hover:to-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed !bg-gradient-to-t from-[#CCE4FF]"
                                style={{
                                    boxShadow: '0 -1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px #E2A42E, inset 1px 1px 0 rgba(255,255,255,0.8), inset -1px -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3)'
                                }}
                            >
                                <span className="text-md font-bold text-[#11207e]">
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Bottom Links */}
                <div className='flex justify-between px-12'>
                    <div className="flex flex-col items-start text-xs gap-2">
                        <label
                            className="text-[#2F22DA] underline hover:text-[#0033AA] cursor-pointer"
                        >
                            Forgot your password?
                        </label>
                        <label
                            className="text-[#2F22DA] underline hover:text-[#0033AA] cursor-pointer"
                        >
                            Service Status
                        </label>
                    </div>
                    <div className="text-xs self-end">
                        <label
                            onClick={onSwitchToRegister}
                            className="text-[#2F22DA] underline hover:text-[#0033AA] cursor-pointer"
                        >
                            Get a new account
                        </label>
                    </div>
                </div>

                {/* Spirit Network Footer */}
                <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Spirit Network</span>
                </div>
            </div>
        </Layout >
    );
}
