import { Menu, Search, Bell } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function TopBar({ title, subtitle, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-200 h-16 flex items-center px-4 lg:px-6 gap-4">
      <button onClick={onMenuClick} className="lg:hidden text-ink-600 hover:text-ink-900">
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-ink-900 leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-ink-500 truncate hidden sm:block">{subtitle}</p>}
      </div>
      <div className="hidden md:flex items-center relative">
        <Search className="absolute left-3 w-4 h-4 text-ink-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-56 lg:w-72 pl-9 pr-3 py-2 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
        />
      </div>
      <button className="relative p-2 text-ink-500 hover:text-ink-800 hover:bg-ink-100 rounded-lg transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
      </button>
    </header>
  );
}
