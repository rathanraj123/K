import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Leaf, Mail, Lock, User, ArrowRight, Sprout, Microscope, 
  AlertTriangle, Shield, Eye, EyeOff, FlaskConical, CheckCircle2
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface DbHealthResponse {
  status: 'connected' | 'error';
  message?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserProfile {
  email: string;
  full_name?: string;
  role?: string;
}

type AuthMode = 'login' | 'register' | 'admin';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'farmer' | 'scientist'>('farmer');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState('');
  const [adminError, setAdminError] = useState('');

  const { setToken, setUserName, setUserRole, logout } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    logout();
    checkConnection();
  }, []);

  useEffect(() => {
    const requestedRole = searchParams.get('role');
    if (requestedRole === 'farmer' || requestedRole === 'scientist') {
      setRole(requestedRole);
      setMode('register');
    }
    if (searchParams.get('admin') === '1') {
      setMode('admin');
    }
  }, [searchParams]);

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      const data = await api.get<DbHealthResponse>('/metrics/health/db');
      setDbStatus(data.status === 'connected' ? 'connected' : 'error');
      if (data.status !== 'connected') setDbError(data.message || 'Database not connected');
    } catch {
      setDbStatus('error');
      setDbError('Backend unreachable');
    }
  };

  // --- Admin login (client-side credential check for demo) ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (email === 'admin@agricosmo.ai' && password === 'admin123') {
      setUserRole('admin');
      setUserName('Admin');
      setToken('admin-session-token');
      navigate('/admin');
    } else {
      setAdminError('Invalid admin credentials.');
    }
  };

  // --- Farmer / Scientist login ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const data = await api.post<LoginResponse>('/auth/login/access-token', formData);
        logout();
        setToken(data.access_token);

        let userRole: string = 'farmer';
        try {
          const profile = await api.get<UserProfile>('/auth/me', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          setUserName(profile.full_name || email.split('@')[0]);
          if (profile.role) {
            userRole = profile.role;
            setUserRole(profile.role as any);
          }
        } catch {
          setUserName(email.split('@')[0]);
        }

        // Role-based redirect
        if (userRole === 'scientist') {
          navigate('/dashboard');
        } else if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Register
        await api.post<UserProfile>('/auth/register', {
          email,
          password,
          full_name: fullName,
          role,
        });
        toast({
          title: 'Account created!',
          description: `Welcome to AgriCosmo. Please log in as a ${role}.`,
        });
        setMode('login');
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      toast({
        title: mode === 'login' ? 'Login failed' : 'Signup failed',
        description: error instanceof Error ? error.message : 'Could not connect to the backend server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black tracking-tight">
              Agri<span className="gradient-text">Cosmo</span>
            </span>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {mode === 'admin' ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-rose-500" />
                    <h1 className="text-2xl font-extrabold text-foreground">Admin Portal</h1>
                  </div>
                  <p className="text-muted-foreground text-sm">Authorized personnel only</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-extrabold text-foreground">
                    {mode === 'login' ? 'Welcome Back' : 'Join AgriCosmo'}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {mode === 'login'
                      ? 'Sign in to your farmer or scientist dashboard'
                      : 'Create your account and choose your role'}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* DB Status */}
        {mode !== 'admin' && dbStatus !== 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-5 p-4 rounded-2xl border flex items-start gap-3 ${
              dbStatus === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-accent border-border'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${dbStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="text-sm font-bold">{dbStatus === 'error' ? 'Backend Connection Issue' : 'Checking connection...'}</p>
              {dbStatus === 'error' && (
                <p className="text-xs text-muted-foreground mt-0.5">{dbError}</p>
              )}
              {dbStatus === 'error' && (
                <button onClick={checkConnection} className="text-xs font-bold text-primary mt-1.5 hover:underline">
                  Retry →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* === MAIN CARD === */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className={`glass rounded-3xl p-8 shadow-2xl relative overflow-hidden border ${
              mode === 'admin' ? 'border-rose-500/20' : 'border-border/50'
            }`}
          >
            {/* Admin mode indicator strip */}
            {mode === 'admin' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 to-rose-400" />
            )}

            <form onSubmit={mode === 'admin' ? handleAdminLogin : handleSubmit} className="space-y-5">
              {/* Full name (register only) */}
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <label className="text-xs font-semibold mb-1.5 block ml-1 text-muted-foreground uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-background/50 border border-border/60 focus:ring-2 focus:ring-primary/40 transition-all outline-none text-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Email */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block ml-1 text-muted-foreground uppercase tracking-wider">
                  {mode === 'admin' ? 'Admin Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setAdminError(''); }}
                    placeholder={mode === 'admin' ? 'admin@agricosmo.ai' : 'name@example.com'}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-background/50 border border-border/60 focus:ring-2 focus:ring-primary/40 transition-all outline-none text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block ml-1 text-muted-foreground uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAdminError(''); }}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-background/50 border border-border/60 focus:ring-2 focus:ring-primary/40 transition-all outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {adminError && (
                  <p className="text-xs text-destructive mt-1.5 ml-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {adminError}
                  </p>
                )}
              </div>

              {/* Role selector (register only) */}
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                  <label className="text-xs font-semibold mb-1.5 block ml-1 text-muted-foreground uppercase tracking-wider">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200 ${
                        role === 'farmer'
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border/50 opacity-60 hover:opacity-90 hover:border-border'
                      }`}
                    >
                      <Sprout className={`w-7 h-7 ${role === 'farmer' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-bold">Farmer</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">Crop scanning & disease alerts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('scientist')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200 ${
                        role === 'scientist'
                          ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10'
                          : 'border-border/50 opacity-60 hover:opacity-90 hover:border-border'
                      }`}
                    >
                      <FlaskConical className={`w-7 h-7 ${role === 'scientist' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-bold">Scientist</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">Research & outbreak analytics</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || (mode !== 'admin' && dbStatus !== 'connected')}
                className={`w-full py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 ${
                  mode === 'admin'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white'
                    : 'gradient-primary text-primary-foreground'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <>
                    {mode === 'admin' && <Shield className="w-4 h-4" />}
                    {mode === 'login' && 'Sign In to Dashboard'}
                    {mode === 'register' && `Create ${role === 'scientist' ? 'Scientist' : 'Farmer'} Account`}
                    {mode === 'admin' && 'Access Admin Panel'}
                    {mode !== 'admin' && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>

            {/* Toggle login/register */}
            {mode !== 'admin' && (
              <div className="mt-6 text-center text-sm border-t border-border/40 pt-5">
                <p className="text-muted-foreground">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setEmail(''); setPassword(''); setFullName(''); }}
                    className="font-bold text-primary hover:underline"
                  >
                    {mode === 'login' ? 'Sign up free' : 'Sign in instead'}
                  </button>
                </p>
              </div>
            )}

            {/* Back from admin */}
            {mode === 'admin' && (
              <div className="mt-5 text-center">
                <button
                  onClick={() => { setMode('login'); setEmail(''); setPassword(''); setAdminError(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to main login
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Admin Login Entry */}
        {mode !== 'admin' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => { setMode('admin'); setEmail(''); setPassword(''); }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors group"
            >
              <Shield className="w-3.5 h-3.5 group-hover:text-rose-500 transition-colors" />
              Admin Access
            </button>
          </motion.div>
        )}

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground/50 mt-5 px-8">
          By continuing, you agree to AgriCosmo's{' '}
          <span className="underline cursor-pointer hover:text-muted-foreground">Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-muted-foreground">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
