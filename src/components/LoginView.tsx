import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, ArrowRight, Sparkles, Shield, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginUser, registerUser, enableDemoMode } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const success = await loginUser(email, password);
        if (!success) {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const res = await registerUser(name, email, password);
        if (res.success) {
          // Auto login after registration
          const success = await loginUser(email, password);
          if (!success) {
            setError("Account created but failed to log in automatically.");
          }
        } else {
          setError(res.error || "Registration failed. Try a different email.");
        }
      }
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[150px]" />

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-650 to-indigo-650 text-white font-black text-lg shadow-lg shadow-purple-900/20">
            CP
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-3">
            CareerPilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            {isLogin ? "Sign in to orchestrate your AI job search assistant" : "Create an account to start tracking career matches"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-2.5 items-start text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wider text-[10px]">Error occurred</p>
              <p className="mt-0.5 font-bold leading-normal">{error}</p>
            </div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-purple-600 rounded-2xl text-xs font-semibold text-white focus:outline-none placeholder-slate-650 transition"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-purple-600 rounded-2xl text-xs font-semibold text-white focus:outline-none placeholder-slate-650 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-purple-600 rounded-2xl text-xs font-semibold text-white focus:outline-none placeholder-slate-650 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-900/30 transition flex items-center justify-center gap-1.5 group mt-6"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Register & Get Started"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Form / Demo mode bypass */}
        <div className="space-y-4 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 font-bold">
            {isLogin ? "New to CareerPilot?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-purple-400 hover:text-purple-300 font-extrabold focus:outline-none transition"
            >
              {isLogin ? "Create Account" : "Sign In"}
            </button>
          </p>

          <button
            onClick={() => {
              enableDemoMode();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-extrabold rounded-xl transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Launch Sandbox Demo Mode</span>
          </button>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest pt-2">
          <Shield className="w-3 h-3 text-emerald-600" />
          <span>Secured by JWT Session Filters</span>
        </div>

      </div>
    </div>
  );
};
