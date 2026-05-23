import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Mail, Lock, User, ArrowRight, Sprout, Microscope, AlertTriangle } from 'lucide-react';
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

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'farmer' | 'scientist'>('farmer');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState('');

  const { setToken, setUserName, setUserRole } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    const requestedRole = searchParams.get('role');
    if (requestedRole === 'farmer' || requestedRole === 'scientist') {
      setRole(requestedRole);
      setIsLogin(false);
    }
  }, [searchParams]);

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      const data = await api.get<DbHealthResponse>('/metrics/health/db');
      if (data.status === 'connected') {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
        setDbError(data.message || 'Database not connected');
      }
    } catch (e) {
      setDbStatus('error');
      setDbError('Backend unreachable');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const data = await api.post<LoginResponse>('/auth/login/access-token', formData);
        setToken(data.access_token);

        try {
          const profile = await api.get<UserProfile>('/auth/me', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          setUserName(profile.full_name || email.split('@')[0]);
          if (profile.role === 'farmer' || profile.role === 'scientist' || profile.role === 'admin') {
            setUserRole(profile.role);
          }
        } catch {
          setUserName(email.split('@')[0]);
        }

        navigate('/dashboard');
      } else {
        await api.post<UserProfile>('/auth/register', {
          email,
          password,
          full_name: fullName,
          role,
        });

        toast({
          title: 'Account created',
          description: 'You can now log in with your email and password.',
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: isLogin ? 'Login failed' : 'Signup failed',
        description: error instanceof Error ? error.message : 'Could not connect to the backend server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Agri<span className="gradient-text">Cosmo</span></span>
          </Link>
          <h1 className="text-3xl font-extrabold">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Enter your credentials to access your dashboard' : 'Join thousands of farmers and researchers'}
          </p>
        </div>

        {/* Database Status Alert */}
        {dbStatus !== 'connected' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${
              dbStatus === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-accent border-border'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${dbStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="text-sm font-bold">{dbStatus === 'error' ? 'Database Connection Required' : 'Checking Database...'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {dbStatus === 'error' ? (
                  <>You must fix your <strong>backend/.env</strong> password before you can {isLogin ? 'login' : 'register'}. Current issue: <code>{dbError}</code></>
                ) : 'Please wait while we verify backend connectivity...'}
              </p>
              {dbStatus === 'error' && (
                <button onClick={checkConnection} className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
                  🔄 Retry connection check
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Form Card */}
        <div className="glass rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <label className="text-sm font-medium mb-1.5 block ml-1 text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-12 pr-4 py-3 rounded-xl glass focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block ml-1 text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl glass focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block ml-1 text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl glass focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                <label className="text-sm font-medium mb-1.5 block ml-1 text-muted-foreground">Tell us your role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      role === 'farmer' ? 'border-primary bg-primary/5' : 'border-border grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    <Sprout className={`w-6 h-6 ${role === 'farmer' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold">Farmer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('scientist')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      role === 'scientist' ? 'border-secondary bg-secondary/5' : 'border-border grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    <Microscope className={`w-6 h-6 ${role === 'scientist' ? 'text-secondary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold">Scientist</span>
                  </button>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || dbStatus !== 'connected'}
              className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? 'Processing...' : (
                <>
                  {isLogin ? 'Login Dashboard' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-primary hover:underline"
              >
                {isLogin ? 'Sign up free' : 'Login instead'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground mt-8 px-8">
          By continuing, you agree to AgriCosmo's <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
