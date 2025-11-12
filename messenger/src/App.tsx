import { useState, useEffect } from "react";
import { SignInWindow } from "./components/sign-in-window";
import { RegistrationWindow } from "./components/registration-window";
import { Layout } from "./components/layout";
import {
  useSignIn,
  useSignUp,
  useSignOut,
  useCurrentUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthInitialized,
} from "./lib/hooks/auth-hooks";
import { useAuthStore } from "./lib/store/auth-store";
import { Loading } from "./components/loading";

type AuthView = 'signin' | 'register' | 'main';

function App() {
  const [currentView, setCurrentView] = useState<AuthView>('signin');

  const { data: user } = useCurrentUser();
  const isAuthenticated = useIsAuthenticated();
  const isAuthLoading = useAuthLoading();
  const isAuthInitialized = useAuthInitialized();
  const signInMutation = useSignIn();
  const signUpMutation = useSignUp();
  const signOutMutation = useSignOut();

  useEffect(() => {
    const initAuth = async () => {
      await useAuthStore.getState().initialize();
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      setCurrentView('main');
    } else if (isAuthInitialized && !isAuthenticated) {
      setCurrentView('signin');
    }
  }, [isAuthInitialized, isAuthenticated]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signInMutation.mutateAsync({ email, password });
      setCurrentView('main');
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      await signUpMutation.mutateAsync({
        username,
        email,
        password,
        displayName: username, // Use username as initial display name
      });
      setCurrentView('main');
    } catch (error) {
      throw error; // Re-throw to let the component handle the error
    }
  };

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
    setCurrentView('signin');
  };

  if (!isAuthInitialized || isAuthLoading) {
    return (
      <Loading />
    );
  }

  if (currentView === 'signin') {
    return (
      <SignInWindow
        onSignIn={handleSignIn}
        onSwitchToRegister={() => setCurrentView('register')}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegistrationWindow
        onRegister={handleRegister}
        onSwitchToSignIn={() => setCurrentView('signin')}
      />
    );
  }

  return (
    <Layout title="MSN Messenger - Main">
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-msn-blue">
                Welcome, {user?.displayName || user?.username}!
              </h1>
              <button
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 transition-colors text-sm"
              >
                {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-msn-online rounded-full"></span>
                <span>Authentication system active (React Query)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-msn-online rounded-full"></span>
                <span>User ID: {user?.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-msn-online rounded-full"></span>
                <span>Email: {user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-msn-online rounded-full"></span>
                <span>Username: {user?.username}</span>
              </div>
            </div>
          </div>

          <div className="bg-msn-light-blue rounded-lg p-6">
            <h3 className="font-semibold mb-3">Authentication Complete</h3>
            <p className="text-sm text-gray-700">
              You are now signed in to MSN Messenger. The main application interface will be implemented in the next tasks.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default App;
