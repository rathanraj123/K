import { motion } from 'framer-motion';
import { Wheat, Microscope } from 'lucide-react';
import { useAppStore, UserRole } from '@/store/useAppStore';

export default function ModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { userRole, setUserRole } = useAppStore();

  if (userRole === 'admin') return null;

  const modes: { role: UserRole; label: string; icon: typeof Wheat }[] = [
    { role: 'farmer', label: 'Farmer', icon: Wheat },
    { role: 'scientist', label: 'Scientist', icon: Microscope },
  ];

  return (
    <div className={`flex items-center rounded-xl glass overflow-hidden ${compact ? 'p-0.5' : 'p-1'}`}>
      {modes.map((m) => (
        <button
          key={m.role}
          onClick={() => setUserRole(m.role)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            userRole === m.role ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {userRole === m.role && (
            <motion.div
              layoutId="mode-bg"
              className="absolute inset-0 rounded-lg gradient-primary"
              style={{ zIndex: 0 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <m.icon className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
