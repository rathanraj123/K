import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Leaf, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUserRole } = useAppStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@agricosmo.ai' && password === 'admin123') {
      setUserRole('admin');
      navigate('/admin');
    } else {
      setError('Invalid credentials. Try admin@agricosmo.ai / admin123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">Access the AgriCosmo admin panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@agricosmo.ai"
              className="w-full px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-lg hover:opacity-95 transition-opacity">
            Sign In
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Demo: admin@agricosmo.ai / admin123
        </p>
      </motion.div>
    </div>
  );
}
