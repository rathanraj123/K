import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf, Microscope, FlaskConical, Zap, ArrowRight,
  ScanLine, Shield, ChevronRight, Wheat, Sprout
} from 'lucide-react';
import { api } from '@/lib/api';

interface DbHealthResponse {
  status: 'connected' | 'error';
  message?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  { icon: ScanLine, title: 'AI Disease Detection', desc: 'Upload a leaf image and get instant, accurate disease identification powered by deep learning.' },
  { icon: FlaskConical, title: 'Cosmetic Insights', desc: 'Discover bioactive compounds and their potential applications in skincare and health.' },
  { icon: Shield, title: 'Treatment Plans', desc: 'Receive step-by-step treatment recommendations backed by agricultural research.' },
  { icon: Microscope, title: 'Biochemical Analysis', desc: 'Deep-dive into phytochemical profiles and extract actionable biotechnology data.' },
];

const stats = [
  { value: '98.7%', label: 'Detection Accuracy' },
  { value: '2M+', label: 'Scans Processed' },
  { value: '150+', label: 'Disease Models' },
  { value: '<2s', label: 'Avg Response Time' },
];

const useCases = [
  { icon: Wheat, role: 'Farmer', desc: 'Simple disease detection, step-by-step treatment, cost estimates, and urgency alerts.', color: 'gradient-primary' },
  { icon: Microscope, role: 'Scientist', desc: 'Deep AI analytics, chemical composition, probability distributions, and exportable data.', color: 'gradient-secondary' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

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

  const handleRoleSelection = (role: 'farmer' | 'scientist') => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center gradient-hero">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="visible" className="space-y-8">
              <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Plant Intelligence
              </motion.div>

              <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-balance">
                Decode Plant Health.{' '}
                <span className="gradient-text">Unlock Cosmetic Potential.</span>
              </motion.h1>

              <motion.p custom={2} variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
                Upload any plant image. Our AI identifies diseases in seconds, suggests treatments, and reveals hidden cosmetic and biochemical insights.
              </motion.p>

              <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-base shadow-lg hover:shadow-xl hover:opacity-95 transition-all glow-primary"
                >
                  Start Scanning
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-border text-foreground font-semibold text-base hover:bg-accent transition-colors"
                >
                  Login
                </Link>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background gradient-primary" />
                  ))}
                </div>
                <span>Trusted by <strong className="text-foreground">2,000+</strong> researchers worldwide</span>
              </motion.div>
            </motion.div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 rounded-3xl gradient-primary opacity-10 blur-2xl" />
                <div className="relative glass rounded-3xl p-8 h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-32 h-32 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl">
                    <Leaf className="w-16 h-16 text-primary-foreground" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-xl">AI Scan Ready</h3>
                    <p className="text-sm text-muted-foreground">Upload a plant leaf to begin analysis</p>
                  </div>
                  <div className="w-full glass rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Detection confidence</span>
                      <span className="font-semibold text-primary">98.7%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '98.7%' }}
                        transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
                        className="h-full rounded-full gradient-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      {['Healthy', 'Disease A', 'Disease B'].map((tag) => (
                        <span key={tag} className="px-2 py-1 text-xs rounded-md bg-accent text-accent-foreground font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Choose Your Role */}
      <section id="role-selection" className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 space-y-3"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
              <Sprout className="w-3.5 h-3.5" />
              Personalized Experience
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Choose Your <span className="gradient-text">Role</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Get a tailored experience based on your needs.
            </p>
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                dbStatus === 'connected' ? 'bg-success/10 text-success' : 
                dbStatus === 'checking' ? 'bg-accent text-muted-foreground' : 
                'bg-destructive/10 text-destructive'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  dbStatus === 'connected' ? 'bg-success animate-pulse' : 
                  dbStatus === 'checking' ? 'bg-muted-foreground animate-spin' : 
                  'bg-destructive'
                }`} />
                {dbStatus === 'connected' ? 'Database Connected' : dbStatus === 'checking' ? 'Checking Connection...' : 'Database Error'}
              </div>
              {dbStatus === 'error' && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-destructive max-w-xs">{dbError}</p>
                  <button 
                    onClick={checkConnection}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    🔄 Retry Connection
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.role}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div
                  onClick={() => handleRoleSelection(uc.role.toLowerCase() as 'farmer' | 'scientist')}
                  className="glass rounded-2xl p-8 hover-lift group block text-left cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-xl ${uc.color} flex items-center justify-center mb-5 group-hover:shadow-lg transition-shadow`}>
                    <uc.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2">{uc.role} Mode</h3>
                  <p className="text-muted-foreground leading-relaxed">{uc.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Enter as {uc.role} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>      {/* Stats */}
      <section className="border-y border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-extrabold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative">
        <div className="absolute top-1/2 left-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
              <Microscope className="w-3.5 h-3.5" />
              Platform Features
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Everything You Need for{' '}
              <span className="gradient-text">Plant Intelligence</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From disease detection to cosmetic compound discovery — a single platform for agriculture and biotechnology research.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover-lift group cursor-default"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              How It <span className="gradient-text">Works</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Image', desc: 'Drag and drop or select a clear plant leaf image.' },
              { step: '02', title: 'AI Analysis', desc: 'Our deep learning model processes and identifies diseases in seconds.' },
              { step: '03', title: 'Get Insights', desc: 'Receive disease info, treatments, and cosmetic compound data.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative glass rounded-2xl p-8 text-center"
              >
                <div className="text-6xl font-black gradient-text opacity-30 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl gradient-primary p-12 sm:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground tracking-tight">
                Ready to Transform Your Research?
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
                Join thousands of researchers and farmers using AI-powered plant intelligence.
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-card text-foreground font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                Start Free Scan
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">AgriCosmo AI</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 AgriCosmo AI. Advancing agriculture through intelligence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
