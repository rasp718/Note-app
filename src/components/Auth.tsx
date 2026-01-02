import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-2xl">
            <div className="w-6 h-6 bg-orange-600 rounded-md shadow-[0_0_20px_rgba(234,88,12,0.6)]"></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-zinc-600 text-sm">
            {isLogin ? 'Sign in to sync your notes' : 'Start syncing your notes across devices'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-300 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-700"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-300 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-700"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-red-400 text-xs leading-relaxed">
                  {error.replace('Firebase: ', '').replace(/\(auth.*?\)\.?/g, '')}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-zinc-500 hover:text-orange-500 text-xs font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;