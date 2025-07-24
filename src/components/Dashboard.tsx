import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, ShoppingCart, BarChart3, Brain, Loader, Send, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, Brush } from 'recharts';
import type { Dataset, KPI } from '../types';
import { deepseekApi } from '../services/deepseekApi';
import { useCurrency } from '../hooks/useCurrency';

interface DashboardProps {
  datasets: Dataset[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const Dashboard: React.FC<DashboardProps> = ({ datasets }) => {
  const { currency, rates } = useCurrency();
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'all' | 'top5' | 'bottom5'>('all');
  const [chartEntries, setChartEntries] = useState(20);
  const [columnFilters, setColumnFilters] = useState<{ [col: string]: { min: number | null, max: number | null } }>({});
  // Dynamic column selection state
  const [xAxisColumn, setXAxisColumn] = useState<string>('');
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  // Chart type selection
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'scatter' | 'pie'>('line');

  useEffect(() => {
    if (datasets.length > 0) {
      setSelectedDataset(datasets[0]);
      generateKPIsFromData(datasets[0]);
      prepareChartData(datasets[0]);
      // Set default X and Y columns
      const numericCols = datasets[0].columns.filter(col => {
        const sampleValue = datasets[0].data[0]?.[col];
        return typeof sampleValue === 'number' || (!isNaN(Number(sampleValue)) && sampleValue !== '' && sampleValue !== null);
      });
      setXAxisColumn(numericCols[0] || 'index');
      setYAxisColumns(numericCols.slice(0, 2));
    }
  }, [datasets]);

  // Update column selection when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      const numericCols = selectedDataset.columns.filter(col => {
        const sampleValue = selectedDataset.data[0]?.[col];
        return typeof sampleValue === 'number' || (!isNaN(Number(sampleValue)) && sampleValue !== '' && sampleValue !== null);
      });
      setXAxisColumn(numericCols[0] || 'index');
      setYAxisColumns(numericCols.slice(0, 2));
    }
  }, [selectedDataset]);

  // --- Updated prepareChartData with aggregation/downsampling ---
  const prepareChartData = (dataset: Dataset) => {
    if (!dataset || dataset.data.length === 0) return;

    // 1. Convert all rows to numeric as before
    const processedData = dataset.data.map((row, index) => {
      const processedRow: any = { index: index + 1 };
      dataset.columns.forEach(column => {
        const value = row[column];
        processedRow[column] = !isNaN(Number(value)) && value !== '' && value !== null ? Number(value) : value;
      });
      return processedRow;
    });

    // 2. Downsample/Aggregate if too large
    const MAX_POINTS = 500;
    let chartReadyData = processedData;
    if (processedData.length > MAX_POINTS) {
      const chunkSize = Math.ceil(processedData.length / MAX_POINTS);
      chartReadyData = [];
      for (let i = 0; i < processedData.length; i += chunkSize) {
        const chunk = processedData.slice(i, i + chunkSize);
        const aggregated: any = { index: chartReadyData.length + 1 };
        dataset.columns.forEach(column => {
          if (typeof chunk[0][column] === 'number') {
            aggregated[column] = chunk.reduce((sum, row) => sum + row[column], 0) / chunk.length;
          } else {
            aggregated[column] = chunk[0][column];
          }
        });
        chartReadyData.push(aggregated);
      }
    }

    setChartData(chartReadyData);
  };

  const generateKPIsFromData = (dataset: Dataset) => {
    if (!dataset || dataset.data.length === 0) return;

    const numericColumns = dataset.columns.filter(col => {
      const sampleValues = dataset.data.slice(0, 10).map(row => row[col]);
      const numericValues = sampleValues.filter(val => !isNaN(Number(val)) && val !== '' && val !== null);
      return numericValues.length > sampleValues.length * 0.7; // At least 70% numeric
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
      
      // Calculate trend based on first and last values
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
  };

  const generateInsights = async () => {
    if (!selectedDataset) return;

    setLoadingInsights(true);
    try {
      // Prepare comprehensive context for DeepSeek
      const numericColumns = selectedDataset.columns.filter(col => {
        const sampleValue = selectedDataset.data[0]?.[col];
        return !isNaN(Number(sampleValue)) && sampleValue !== '';
      });

      const dataStats = numericColumns.map(col => {
        const values = selectedDataset.data.map(row => Number(row[col])).filter(val => !isNaN(val));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        return {
          column: col,
          average: avg,
          total: sum,
          max,
          min,
          count: values.length
        };
      });

      const context = `
        Business Data Analysis Request:
        Dataset: ${selectedDataset.name}
        Total Records: ${selectedDataset.data.length}
        Columns: ${selectedDataset.columns.join(', ')}

        All monetary values are in INR (Indian Rupees).

        Statistical Summary:
        ${dataStats.map(stat => 
          `${stat.column}: Avg=${stat.average.toFixed(2)}, Total=${stat.total.toFixed(2)}, Max=${stat.max}, Min=${stat.min}, Count=${stat.count}`
        ).join('\n')}

        Instructions:
        - For large datasets, focus on summarizing key trends, correlations, and anomalies.
        - Identify and explain outliers, sudden changes, or unusual patterns.
        - Prioritize actionable business insights and strategic recommendations.
        - Highlight performance indicators and their implications.
        - Use concise bullet points for clarity.
        - Suggest further analysis, visualizations, or data segments if relevant.
        - If possible, relate findings to business goals or industry benchmarks.

        Please provide:
        1. Key business insights and trends
        2. Notable patterns or anomalies
        3. Strategic recommendations
        4. Performance indicators analysis
        5. Actionable next steps
      `;

      const aiInsights = await deepseekApi.generateInsights(selectedDataset.data, context);
      setInsights(aiInsights);
    } catch (error) {
      setInsights('Failed to generate insights. Please check your connection and try again.');
    }
    setLoadingInsights(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !selectedDataset) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setLoadingChat(true);

    try {
      // Enhanced context for chat queries
      const relevantData = selectedDataset.data.slice(0, 10);

      // Calculate basic stats for numeric columns
      const numericColumns = selectedDataset.columns.filter(col => {
        const sampleValue = selectedDataset.data[0]?.[col];
        return !isNaN(Number(sampleValue)) && sampleValue !== '';
      });
      const dataStats = numericColumns.map(col => {
        const values = selectedDataset.data.map(row => Number(row[col])).filter(val => !isNaN(val));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        return `${col}: Avg=${avg.toFixed(2)}, Total=${sum.toFixed(2)}, Max=${max}, Min=${min}, Count=${values.length}`;
      }).join('\n');

      const context = `
        User Question: "${chatInput}"

        Dataset Context:
        - Name: ${selectedDataset.name}
        - Total Records: ${selectedDataset.data.length}
        - Columns: ${selectedDataset.columns.join(', ')}

        All monetary values are in INR (Indian Rupees).

        Sample Data (first 10 records):
        ${JSON.stringify(relevantData, null, 2)}

        Statistical Summary:
        ${dataStats}

        Current KPIs:
        ${kpis.map(kpi => `${kpi.name}: ${kpi.value} (${kpi.trend} ${kpi.changePercent}%)`).join('\n')}

        Please provide a specific, data-driven answer to the user's question based on this dataset.
        and only if user asks then provide the answer (For large datasets, focus on summarizing key trends, patterns, and anomalies. Highlight actionable insights, outliers, and business implications.) Use concise bullet points and suggest further analysis or visualizations if relevant.
      `;
      
      const aiResponse = await deepseekApi.generateInsights(selectedDataset.data, context);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
    setLoadingChat(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getKPIIcon = (name: string) => {
    if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('sales')) {
      return <DollarSign className="w-6 h-6" />;
    }
    if (name.toLowerCase().includes('user') || name.toLowerCase().includes('customer')) {
      return <Users className="w-6 h-6" />;
    }
    if (name.toLowerCase().includes('conversion') || name.toLowerCase().includes('rate')) {
      return <ShoppingCart className="w-6 h-6" />;
    }
    return <BarChart3 className="w-6 h-6" />;
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

  // Get numeric columns for charts
  const numericColumns = selectedDataset?.columns.filter(col => {
    if (!chartData.length) return false;
    const sampleValue = chartData[0]?.[col];
    return typeof sampleValue === 'number' && !isNaN(sampleValue);
  }) || [];

  const COLORS = ['#00C9FF', '#92FE9D', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  // --- Filtered and paginated chart data ---
  const getFilteredChartData = () => {
    let filtered = [...chartData];
    // Apply column filters
    numericColumns.forEach(col => {
      const filter = columnFilters[col];
      if (filter) {
        const { min, max } = filter;
        if (min !== null && typeof min === 'number') {
          filtered = filtered.filter(row => row[col] >= min);
        }
        if (max !== null && typeof max === 'number') {
          filtered = filtered.filter(row => row[col] <= max);
        }
      }
    });
    // Apply view (top5/bottom5/all)
    if (chartView === 'top5') {
      filtered = filtered.sort((a, b) => b[numericColumns[0]] - a[numericColumns[0]]).slice(0, 5);
    } else if (chartView === 'bottom5') {
      filtered = filtered.sort((a, b) => a[numericColumns[0]] - b[numericColumns[0]]).slice(0, 5);
    } else {
      filtered = filtered.slice(0, chartEntries);
    }
    return filtered;
  };

  const filteredChartData = getFilteredChartData();

  // For dynamic column selection, fallback to 'index' if not set
  const xCol = xAxisColumn || 'index';
  const yCols = yAxisColumns.length > 0 ? yAxisColumns : numericColumns.slice(0, 2);

  // --- Time Series Handling ---
  // Find date/time columns
  const dateColumns = selectedDataset?.columns.filter(col => {
    if (!chartData.length) return false;
    const sampleValue = chartData[0]?.[col];
    // Simple check: is string and can be parsed as date
    return typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue));
  }) || [];
  const [dateGrouping, setDateGrouping] = useState<'none' | 'day' | 'week' | 'month'>('none');
  // --- Aggregation Method ---
  const [aggregationMethod, setAggregationMethod] = useState<'average' | 'sum' | 'min' | 'max' | 'median'>('average');
  // --- Brush (Zoom & Pan) ---
  const [brushRange, setBrushRange] = useState<{ startIndex: number, endIndex: number } | null>(null);

  // Aggregate chart data by date grouping if selected
  const getTimeGroupedData = () => {
    if (dateGrouping === 'none' || !dateColumns.includes(xCol)) return filteredChartData;
    // Group by day/week/month
    const groupKeyFn = (row: any) => {
      const date = new Date(row[xCol]);
      if (dateGrouping === 'day') return date.toISOString().slice(0, 10);
      if (dateGrouping === 'week') {
        // Get ISO week string
        const d = new Date(date.getTime());
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - d.getDay() + 1); // Monday as first day
        const week = Math.ceil((((d.getTime() - new Date(d.getFullYear(),0,1).getTime())/86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
        return `${d.getFullYear()}-W${week}`;
      }
      if (dateGrouping === 'month') return date.toISOString().slice(0, 7);
      return row[xCol];
    };
    // Group rows
    const groups: {[key: string]: any[]} = {};
    filteredChartData.forEach(row => {
      const key = groupKeyFn(row);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    // Aggregate each group using selected method
    const aggregate = (arr: number[]) => {
      if (aggregationMethod === 'sum') return arr.reduce((a, b) => a + b, 0);
      if (aggregationMethod === 'min') return Math.min(...arr);
      if (aggregationMethod === 'max') return Math.max(...arr);
      if (aggregationMethod === 'median') {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      // average
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };
    return Object.entries(groups).map(([key, rows], idx) => {
      const agg: any = { [xCol]: key, index: idx + 1 };
      yCols.forEach(col => {
        const vals = rows.map(r => (typeof r[col] === 'number' ? r[col] : 0));
        agg[col] = aggregate(vals);
      });
      return agg;
    });
  };
  const chartDisplayData = getTimeGroupedData();

  // Apply brush range to chartDisplayData if set
  const chartDisplayDataWithBrush = React.useMemo(() => {
    if (brushRange && chartDisplayData.length > 0) {
      const start = Math.max(brushRange.startIndex, 0);
      const end = Math.min(brushRange.endIndex, chartDisplayData.length - 1);
      return chartDisplayData.slice(start, end + 1);
    }
    return chartDisplayData;
  }, [chartDisplayData, brushRange]);

  // Reset brush when filters/grouping change
  React.useEffect(() => {
    setBrushRange(null);
  }, [chartEntries, chartView, columnFilters, xAxisColumn, yAxisColumns, chartType, dateGrouping, aggregationMethod]);

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={chartDisplayDataWithBrush}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey={xCol}
            stroke="#6B7280"
            fontSize={12}
            interval="preserveStartEnd"
            tickCount={10}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none', 
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px'
            }} 
          />
          <Brush dataKey={xCol} height={24} stroke="#3B82F6" travellerWidth={8}
            onChange={(range: { startIndex?: number; endIndex?: number }) => {
              if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
                setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
              } else {
                setBrushRange(null);
              }
            }}
          />
          {yCols.map((column, index) => (
            <Line 
              key={column}
              type="monotone" 
              dataKey={column} 
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={3}
              dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      );
    }
    if (chartType === 'bar') {
      return (
        <BarChart data={chartDisplayDataWithBrush}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey={xCol}
            stroke="#6B7280"
            fontSize={12}
            interval="preserveStartEnd"
            tickCount={10}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none', 
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px'
            }} 
          />
          <Brush dataKey={xCol} height={24} stroke="#3B82F6" travellerWidth={8}
            onChange={(range: { startIndex?: number; endIndex?: number }) => {
              if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
                setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
              } else {
                setBrushRange(null);
              }
            }}
          />
          {yCols.map((column, index) => (
            <Bar 
              key={column}
              dataKey={column} 
              fill={COLORS[index % COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      );
    }
    if (chartType === 'area') {
      return (
        <AreaChart data={chartDisplayDataWithBrush}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey={xCol}
            stroke="#6B7280"
            fontSize={12}
            interval="preserveStartEnd"
            tickCount={10}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none', 
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px'
            }} 
          />
          <Brush dataKey={xCol} height={24} stroke="#3B82F6" travellerWidth={8}
            onChange={(range: { startIndex?: number; endIndex?: number }) => {
              if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
                setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
              } else {
                setBrushRange(null);
              }
            }}
          />
          {yCols.map((column, index) => (
            <Area 
              key={column}
              type="monotone"
              dataKey={column}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    }
    if (chartType === 'scatter' && yCols.length >= 2) {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis dataKey={yCols[0]} name={yCols[0]} stroke="#6B7280" fontSize={12} />
          <YAxis dataKey={yCols[1]} name={yCols[1]} stroke="#6B7280" fontSize={12} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Data" data={chartDisplayData} fill={COLORS[0]} />
        </ScatterChart>
      );
    }
    if (chartType === 'pie' && yCols.length > 0) {
      return (
        <PieChart>
          <Tooltip />
          <Pie
            data={chartDisplayData}
            dataKey={yCols[0]}
            nameKey={xCol}
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill={COLORS[0]}
            label
          >
            {chartDisplayData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    // Always return a valid ReactElement
    return <div style={{height: '100%'}} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your key metrics and insights
          </p>
        </div>
        {selectedDataset && (
          <button
            onClick={generateInsights}
            disabled={loadingInsights}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {loadingInsights ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Generate AI Insights
          </button>
        )}
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Import your business data to start viewing analytics and insights
          </p>
        </div>
      ) : (
        <>
          {/* Dataset Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gradient-card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Dataset for Analysis
            </label>
            <select
              value={selectedDataset?.id || ''}
              onChange={(e) => {
                const dataset = datasets.find(d => d.id === e.target.value);
                setSelectedDataset(dataset || null);
                if (dataset) {
                  generateKPIsFromData(dataset);
                  prepareChartData(dataset);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.data.length} records)
                </option>
              ))}
            </select>
          </div>

          {/* KPI Cards */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 dark:text-gray-400">
                      {getKPIIcon(kpi.name)}
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpi.trend)}
                      <span className={`text-sm font-medium ${
                        kpi.trend === 'up' ? 'text-emerald-500' : 
                        kpi.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.name}</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {kpi.unit === '$' ? formatCurrency(kpi.value) : `${kpi.value}${kpi.unit}`}
                    </p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>vs Maximum</span>
                        <span>{Math.round((kpi.value / kpi.target) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart Controls */}
          {selectedDataset && chartData.length > 0 && numericColumns.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center mb-4">
              {/* Entries Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Entries</label>
                <select
                  value={chartEntries}
                  onChange={e => { setChartEntries(Number(e.target.value)); setChartView('all'); }}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  {[20, 50, 100, 250, 500, 1000].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              {/* Top/Bottom 5 Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">View</label>
                <select
                  value={chartView}
                  onChange={e => setChartView(e.target.value as 'all' | 'top5' | 'bottom5')}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  <option value="all">All</option>
                  <option value="top5">Top 5</option>
                  <option value="bottom5">Bottom 5</option>
                </select>
              </div>
              {/* Numeric Column Filters */}
              {numericColumns.map(col => (
                <div key={col} className="flex flex-col">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{col} Filter</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-16 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                      value={columnFilters[col]?.min ?? ''}
                      onChange={e => setColumnFilters(f => ({ ...f, [col]: { ...f[col], min: e.target.value === '' ? null : Number(e.target.value) } }))}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-16 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                      value={columnFilters[col]?.max ?? ''}
                      onChange={e => setColumnFilters(f => ({ ...f, [col]: { ...f[col], max: e.target.value === '' ? null : Number(e.target.value) } }))}
                    />
                  </div>
                </div>
              ))}
             {/* Dynamic Column Selection */}
             <div>
               <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">X Axis</label>
               <select
                 value={xAxisColumn}
                 onChange={e => setXAxisColumn(e.target.value)}
                 className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
               >
                 <option value="index">index</option>
                 {numericColumns.map(col => (
                   <option key={col} value={col}>{col}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Y Axis (up to 2)</label>
               <select
                 multiple
                 value={yAxisColumns}
                 onChange={e => {
                   const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                   setYAxisColumns(options.slice(0, 2));
                 }}
                 className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs min-w-[100px]"
                 size={Math.min(4, numericColumns.length)}
               >
                 {numericColumns.map(col => (
                   <option key={col} value={col}>{col}</option>
                 ))}
               </select>
             </div>
             {/* Chart Type Dropdown */}
             <div>
               <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Chart Type</label>
               <select
                 value={chartType}
                 onChange={e => setChartType(e.target.value as any)}
                 className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
               >
                 <option value="line">Line</option>
                 <option value="bar">Bar</option>
                 <option value="area">Area</option>
                 <option value="scatter">Scatter</option>
                 <option value="pie">Pie</option>
               </select>
             </div>
             {/* Time Series Grouping Dropdown */}
             {dateColumns.length > 0 && (
               <div>
                 <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Time Grouping</label>
                 <select
                   value={dateGrouping}
                   onChange={e => setDateGrouping(e.target.value as 'none' | 'day' | 'week' | 'month')}
                   className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                 >
                   <option value="none">None</option>
                   <option value="day">Day</option>
                   <option value="week">Week</option>
                   <option value="month">Month</option>
                 </select>
               </div>
             )}
             {/* Aggregation Method Dropdown */}
             <div>
               <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Aggregation</label>
               <select
                 value={aggregationMethod}
                 onChange={e => setAggregationMethod(e.target.value as any)}
                 className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
               >
                 <option value="average">Average</option>
                 <option value="sum">Sum</option>
                 <option value="min">Min</option>
                 <option value="max">Max</option>
                 <option value="median">Median</option>
               </select>
             </div>
            </div>
          )}

          {/* Charts Grid */}
          {selectedDataset && chartData.length > 0 && numericColumns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart Rendering based on chartType */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg col-span-1 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">{chartType} Chart</h3>
                <ResponsiveContainer width="100%" height={350}>
                  {renderChart()}
                </ResponsiveContainer>
              </div>

              {/* AI Insights */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights Summary</h3>
                </div>
                <div className="space-y-3">
                  {loadingInsights ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Generating insights...</span>
                    </div>
                  ) : insights ? (
                    <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{insights}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
                      Click "Generate AI Insights" to analyze your data with DeepSeek AI
                    </p>
                  )}
                </div>
              </div>

              {/* AI Chat Interface */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Chat Assistant</h3>
                </div>
                
                {/* Chat Messages */}
                <div className="h-64 overflow-y-auto mb-4 space-y-3 border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      Ask questions about your data and KPIs
                    </p>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.type === 'user' 
                            ? 'bg-gradient-primary text-white' 
                            : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-500'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {loadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-500">
                        <Loader className="w-4 h-4 animate-spin text-gray-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Ask about your data..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    disabled={loadingChat}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={loadingChat || !chatInput.trim()}
                    className="px-3 py-2 bg-gradient-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chart Summary Table: Top 5 / Bottom 5 */}
          {selectedDataset && chartData.length > 0 && numericColumns.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg col-span-1 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chart Summary Table</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">#</th>
                      {numericColumns.map(col => (
                        <th key={col} className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Top 5 */}
                    {(() => {
                      // Sort by first numeric column descending
                      const sorted = [...filteredChartData].sort((a, b) => b[numericColumns[0]] - a[numericColumns[0]]);
                      return sorted.slice(0, 5).map((row, idx) => (
                        <tr key={"top-" + idx} className="bg-emerald-50 dark:bg-emerald-900/30">
                          <td className="px-3 py-2 font-bold">Top {idx + 1}</td>
                          {numericColumns.map(col => (
                            <td key={col} className="px-3 py-2">{row[col]}</td>
                          ))}
                        </tr>
                      ));
                    })().map(row => row)}
                    {/* Bottom 5 */}
                    {(() => {
                      // Sort by first numeric column ascending
                      const sorted = [...filteredChartData].sort((a, b) => a[numericColumns[0]] - b[numericColumns[0]]);
                      return sorted.slice(0, 5).map((row, idx) => (
                        <tr key={"bottom-" + idx} className="bg-red-50 dark:bg-red-900/30">
                          <td className="px-3 py-2 font-bold">Bottom {idx + 1}</td>
                          {numericColumns.map(col => (
                            <td key={col} className="px-3 py-2">{row[col]}</td>
                          ))}
                        </tr>
                      ));
                    })().map(row => row)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};