import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DataImport } from './components/DataImport';
import { Analytics } from './components/Analytics';
import { Goals } from './components/Goals';
import type { Dataset } from './types';
import { CurrencyProvider } from './hooks/useCurrency';
import { useDeepSeekApiKey } from './hooks/useDeepSeekApiKey';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const { apiKey, setApiKey } = useDeepSeekApiKey();

  // Ensure API key is loaded from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('deepseekApiKey') || '';
    if (storedKey && storedKey !== apiKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleDataImported = (dataset: Dataset) => {
    setDatasets(prev => [...prev, dataset]);
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard datasets={datasets} />;
      case 'import':
        return <DataImport onDataImported={handleDataImported} />;
      case 'analytics':
        return <Analytics datasets={datasets} />;
      case 'goals':
        return <Goals datasets={datasets} />;
      default:
        return <Dashboard datasets={datasets} />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="deepseek-api-key">DeepSeek API Key: </label>
        <input
          id="deepseek-api-key"
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your DeepSeek API Key"
          style={{ width: '300px' }}
        />
      </div>
      <CurrencyProvider>
        <Layout currentView={currentView} onViewChange={setCurrentView}>
          {renderCurrentView()}
        </Layout>
      </CurrencyProvider>
    </div>
  );
}

export default App;