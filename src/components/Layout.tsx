import React from 'react';
import { BarChart3, Moon, Sun, Settings, Upload, TrendingUp, Target } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useCurrency, SUPPORTED_CURRENCIES } from '../hooks/useCurrency';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'import', label: 'Import Data', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'goals', label: 'Goals & KPIs', icon: Target },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-transparent bg-gradient-primary bg-clip-text" />
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Smart Analyst</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Currency Dropdown */}
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as typeof currency)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            style={{ minWidth: 100 }}
          >
            {SUPPORTED_CURRENCIES.map(cur => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gradient-card hover:bg-gradient-primary hover:text-white transition-all duration-200"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-transparent bg-gradient-primary bg-clip-text" />
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Whysorush Analytics Pro</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gradient-card hover:bg-gradient-primary hover:text-white transition-all duration-200"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      currentView === item.id
                        ? 'bg-gradient-card text-transparent bg-gradient-primary bg-clip-text border border-blue-200 dark:border-blue-800'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${currentView === item.id ? 'text-blue-500' : ''}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 ml-64">
      {children}
      </main>
    </div>
  );
};