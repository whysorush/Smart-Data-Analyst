import React, { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, Calendar, CheckCircle, AlertTriangle, Clock, Brain, Loader } from 'lucide-react';
import type { Goal, KPI, Dataset } from '../types';
import { deepseekApi } from '../services/deepseekApi';
import { useCurrency } from '../hooks/useCurrency';

interface GoalsProps {
  datasets: Dataset[];
}

export const Goals: React.FC<GoalsProps> = ({ datasets }) => {
  const { currency, rates } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalInput, setGoalInput] = useState('');

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [recommendations, setRecommendations] = useState<string>('');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: '',
    deadline: ''
  });
  const [loadingGoalSync, setLoadingGoalSync] = useState<string | null>(null);

  useEffect(() => {
    if (datasets.length > 0) {
      setSelectedDataset(datasets[0]);
      generateKPIsFromData(datasets[0]);
    } else {
      setKpis([]);
      setSelectedDataset(null);
    }
  }, [datasets]);

  const generateKPIsFromData = (dataset: Dataset) => {
    if (!dataset || dataset.data.length === 0) {
      setKpis([]);
      return;
    }

    const numericColumns = dataset.columns.filter(col => {
      const sampleValues = dataset.data.slice(0, 10).map(row => row[col]);
      const numericValues = sampleValues.filter(val => !isNaN(Number(val)) && val !== '' && val !== null);
      return numericValues.length > sampleValues.length * 0.7;
    });

    const generatedKPIs: KPI[] = numericColumns.slice(0, 4).map((column, index) => {
      const values = dataset.data
        .map(row => Number(row[column]))
        .filter(val => !isNaN(val) && val !== 0);
      
      if (values.length === 0) return null;

      const total = values.reduce((sum, val) => sum + val, 0);
      const average = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
      const changePercent = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        id: (index + 1).toString(),
        name: column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1'),
        value: Math.round(average * 100) / 100,
        target: Math.round(max * 100) / 100,
        unit: column.toLowerCase().includes('revenue') || 
              column.toLowerCase().includes('sales') || 
              column.toLowerCase().includes('price') || 
              column.toLowerCase().includes('cost') ? '$' : '',
        trend: trend as 'up' | 'down' | 'stable',
        changePercent: Math.round(changePercent * 100) / 100
      };
    }).filter(Boolean) as KPI[];

    setKpis(generatedKPIs);

    // Update goals with current values from KPIs
    setGoals(prevGoals => prevGoals.map(goal => {
      const matchingKPI = generatedKPIs.find(kpi => 
        goal.title.toLowerCase().includes(kpi.name.toLowerCase()) ||
        kpi.name.toLowerCase().includes(goal.title.toLowerCase().split(' ')[1] || '')
      );
      
      if (matchingKPI) {
        const progress = matchingKPI.value / goal.target;
        const status = progress >= 0.9 ? 'on-track' : progress >= 0.7 ? 'at-risk' : 'off-track';
        return { ...goal, current: matchingKPI.value, status };
      }
      return goal;
    }));
  };

  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'at-risk':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'off-track':
        return <Clock className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'at-risk':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'off-track':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    }
  };

  const generateRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const kpiRecommendations = await deepseekApi.generateKPIRecommendations(kpis);
      setRecommendations(kpiRecommendations);
    } catch (error) {
      setRecommendations('Failed to generate recommendations. Please try again.');
    }
    setLoadingRecommendations(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.title && newGoal.target && newGoal.deadline) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title,
        description: newGoal.description,
        target: parseFloat(newGoal.target),
        current: 0,
        deadline: new Date(newGoal.deadline),
        status: 'on-track'
      };
      setGoals(prev => [...prev, goal]);
      setNewGoal({ title: '', description: '', target: '', deadline: '' });
      setShowNewGoalForm(false);
    }
  };

  const formatCurrency = (value: number) => {
    const converted = value * (rates[currency] / rates['INR']);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  // Sync a goal with AI to get a 1-3 sentence insight
  const handleSyncGoalWithAI = async (goalId: string) => {
    if (!selectedDataset) return;
    setLoadingGoalSync(goalId);
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;
      const insight = await deepseekApi.generateGoalInsight(goal, selectedDataset);
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? { ...g, insight } : g));
    } catch (error) {
      setGoals(prevGoals => prevGoals.map(g => g.id === goalId ? { ...g, insight: 'Failed to generate insight. Please try again.' } : g));
    }
    setLoadingGoalSync(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Goals & KPIs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your business objectives and key performance indicators
          </p>
        </div>
        <div className="flex gap-3">
          {datasets.length > 0 && (
            <select
              value={selectedDataset?.id || ''}
              onChange={(e) => {
                const dataset = datasets.find(d => d.id === e.target.value);
                setSelectedDataset(dataset || null);
                if (dataset) generateKPIsFromData(dataset);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={generateRecommendations}
            disabled={loadingRecommendations || kpis.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingRecommendations ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            AI Recommendations
          </button>
          <button
            onClick={() => setShowNewGoalForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Import your business data to start tracking KPIs and goals
          </p>
        </div>
      ) : kpis.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No KPIs Generated</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your data doesn't contain enough numeric columns to generate KPIs
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{kpi.name}</h3>
                <div className={`flex items-center gap-1 ${
                  kpi.trend === 'up' ? 'text-green-500' : 
                  kpi.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                  <span className="text-sm font-medium">
                    {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpi.unit === '$' ? formatCurrency(kpi.value) : `${kpi.value}${kpi.unit}`}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      / {kpi.unit === '$' ? formatCurrency(kpi.target) : `${kpi.target}${kpi.unit}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.round((kpi.value / kpi.target) * 100)}% of target
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Goals</h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {goals.map((goal) => (
            <div key={goal.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.title}</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(goal.status)}`}> 
                      {getStatusIcon(goal.status)}
                      {goal.status.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{goal.description}</p>
                  {/* Sync with AI button and insight */}
                  {!goal.insight && (
                    <button
                      onClick={() => handleSyncGoalWithAI(goal.id)}
                      disabled={loadingGoalSync === goal.id}
                      className="mb-3 flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
                    >
                      {loadingGoalSync === goal.id ? <Loader className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      Sync with AI
                    </button>
                  )}
                  {goal.insight && (
                    <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded text-emerald-900 dark:text-emerald-200 text-sm">
                      <span className="font-semibold">AI Insight:</span> {goal.insight}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Progress</span>
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {goal.target >= 1000 ? formatCurrency(goal.current) : goal.current}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {Math.round((goal.current / goal.target) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              goal.status === 'on-track' ? 'bg-green-500' :
                              goal.status === 'at-risk' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Target</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {goal.target >= 1000 ? formatCurrency(goal.target) : goal.target}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Deadline</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {goal.deadline instanceof Date
                            ? goal.deadline.toLocaleDateString()
                            : new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Recommendations</h3>
        </div>
        
        {loadingRecommendations ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Generating recommendations...</span>
          </div>
        ) : recommendations ? (
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
            {/* Beautify AI Recommendations output */}
            {(() => {
              // Try to split into bullet points or numbered list
              const lines = recommendations.split(/\n|\r/).filter(l => l.trim());
              const isBulleted = lines.every(l => l.trim().match(/^[-*•]/));
              const isNumbered = lines.every(l => l.trim().match(/^\d+\./));
              if (isBulleted) {
                return (
                  <ul className="list-disc pl-5">
                    {lines.map((l, i) => <li key={i}>{l.replace(/^[-*•]\s*/, '')}</li>)}
                  </ul>
                );
              } else if (isNumbered) {
                return (
                  <ol className="list-decimal pl-5">
                    {lines.map((l, i) => <li key={i}>{l.replace(/^\d+\.\s*/, '')}</li>)}
                  </ol>
                );
              } else {
                return (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded">
                    <span>{recommendations}</span>
                  </div>
                );
              }
            })()}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Click "Get AI Recommendations" to receive strategic insights for improving your KPIs
          </p>
        )}
      </div>

      {/* New Goal Modal */}
      {showNewGoalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Goal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter goal title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Describe your goal"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter target value"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddGoal}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Goal
              </button>
              <button
                onClick={() => setShowNewGoalForm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};