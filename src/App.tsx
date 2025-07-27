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
  const [importedDataset, setImportedDataset] = useState<Dataset | null>(null);
  const { apiKey, setApiKey } = useDeepSeekApiKey();

  // Ensure API key is loaded from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('deepseekApiKey') || '';
    if (storedKey && storedKey !== apiKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleDataImported = (dataset: Dataset) => {
    setImportedDataset(dataset);
    setDatasets(prev => [...prev, dataset]);
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard datasets={datasets} />;
      case 'import':
        return (
          <>
            <DataImport onDataImported={handleDataImported} />
            {importedDataset && (
              <button onClick={() => setCurrentView('dashboard')}>
                Continue to Dashboard
              </button>
            )}
          </>
        );
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
      
      
      <CurrencyProvider>
        
        <Layout currentView={currentView} onViewChange={setCurrentView}>
        <div className="mb-6 flex flex-col max-w-md">
        <label
          htmlFor="deepseek-api-key"
          className="mb-2 text-sm font-medium text-gray-700"
        >
          DeepSeek API Key
        </label>
        <input
          id="deepseek-api-key"
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your DeepSeek API Key"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <span className="mt-1 text-xs text-gray-500">
          Your API key is kept private and never shared.
        </span>
      </div>
          {renderCurrentView()}
        </Layout>
      </CurrencyProvider>
    </div>
  );
}

export default App;