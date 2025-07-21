import React, { useState } from 'react';
import { TrendingUp, BarChart, PieChart, LineChart as LineIcon, Settings, Download, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area } from 'recharts';
import type { Dataset, ChartConfig } from '../types';
import { deepseekApi } from '../services/deepseekApi';

interface AnalyticsProps {
  datasets: Dataset[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ datasets }) => {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(datasets[0] || null);
  const [predictedChartType, setPredictedChartType] = useState<string>('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'line',
    xAxis: '',
    yAxis: [],
    title: 'Custom Chart'
  });

  React.useEffect(() => {
    if (datasets.length > 0 && !selectedDataset) {
      setSelectedDataset(datasets[0]);
    }
    if (selectedDataset && selectedDataset.columns.length > 0) {
      setChartConfig(prev => ({
        ...prev,
        xAxis: selectedDataset.columns[0],
        yAxis: selectedDataset.columns.slice(1, 2)
      }));
      predictChartType();
    }
  }, [datasets, selectedDataset]);

  React.useEffect(() => {
    applyFilters();
  }, [selectedDataset, filterColumn, filterValue]);

  const applyFilters = () => {
    if (!selectedDataset) {
      setFilteredData([]);
      return;
    }

    let data = selectedDataset.data.slice(0, 50); // Increased limit for better analysis

    if (filterColumn && filterValue) {
      data = data.filter(row => {
        const cellValue = String(row[filterColumn]).toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    }

    // Format data for charts
    const formattedData = data.map((item, index) => {
      const processedRow: any = { index: index + 1 };
      
      selectedDataset.columns.forEach(column => {
        const value = item[column];
        if (!isNaN(Number(value)) && value !== '' && value !== null) {
          processedRow[column] = Number(value);
        } else {
          processedRow[column] = value;
        }
      });
      
      return processedRow;
    });

    setFilteredData(formattedData);
  };

  const predictChartType = async () => {
    if (!selectedDataset || selectedDataset.data.length === 0) return;

    setLoadingPrediction(true);
    try {
      const prediction = await deepseekApi.predictChartType(
        selectedDataset.columns,
        selectedDataset.data
      );
      setPredictedChartType(prediction);
    } catch (error) {
      console.error('Chart prediction failed:', error);
      setPredictedChartType('bar');
    }
    setLoadingPrediction(false);
  };

  const chartData = filteredData;

  const renderChart = () => {
    if (!selectedDataset || chartData.length === 0) return null;

    // Ensure data is properly formatted for charts
    const formattedData = chartData.map((item, index) => ({
      ...item,
      index: index + 1
    }));

    const commonProps = {
      data: formattedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartConfig.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey={chartConfig.xAxis || 'index'} 
              stroke="#6B7280"
              fontSize={12}
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
            {chartConfig.yAxis.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4]}
                strokeWidth={3}
                dot={{ fill: ['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: ['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <RechartsBar {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey={chartConfig.xAxis || 'index'} 
              stroke="#6B7280"
              fontSize={12}
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
            {chartConfig.yAxis.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBar>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey={chartConfig.xAxis || 'index'} 
              stroke="#6B7280"
              fontSize={12}
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
            {chartConfig.yAxis.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4]}
                fill={['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey={chartConfig.xAxis || 'index'} 
                stroke="#6B7280"
                fontSize={12}
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
              {chartConfig.yAxis.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4]}
                  strokeWidth={0}
                  dot={{ fill: ['#00C9FF', '#92FE9D', '#3B82F6', '#10B981'][index % 4], strokeWidth: 2, r: 6 }}
                  line={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const exportChart = () => {
    // In a real app, this would export the chart as an image or PDF
    console.log('Exporting chart...', chartConfig);
  };

  const chartTypes = [
    { id: 'line', name: 'Line Chart', icon: LineIcon },
    { id: 'bar', name: 'Bar Chart', icon: BarChart },
    { id: 'scatter', name: 'Scatter Plot', icon: TrendingUp },
    { id: 'area', name: 'Area Chart', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Advanced Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create custom visualizations and deep-dive into your data
          </p>
        </div>
        <button
          onClick={exportChart}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export Chart
        </button>
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <BarChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Import your data first to start creating advanced analytics
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chart Configuration</h3>
              </div>

              <div className="space-y-4">
                {/* Dataset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dataset
                  </label>
                  <select
                    value={selectedDataset?.id || ''}
                    onChange={(e) => {
                      const dataset = datasets.find(d => d.id === e.target.value);
                      setSelectedDataset(dataset || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {datasets.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chart Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Type
                  </label>
                  {predictedChartType && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          AI Recommended: {chartTypes.find(t => t.id === predictedChartType)?.name}
                        </span>
                        <button
                          onClick={() => setChartConfig(prev => ({ ...prev, type: predictedChartType as any }))}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {chartTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setChartConfig(prev => ({ ...prev, type: type.id as any }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            chartConfig.type === type.id
                              ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={predictChartType}
                    disabled={loadingPrediction || !selectedDataset}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm"
                  >
                    {loadingPrediction ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Predicting...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3 h-3" />
                        AI Chart Suggestion
                      </>
                    )}
                  </button>
                </div>

                {/* X-Axis */}
                {selectedDataset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      X-Axis
                    </label>
                    <select
                      value={chartConfig.xAxis}
                      onChange={(e) => setChartConfig(prev => ({ ...prev, xAxis: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {selectedDataset.columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Y-Axis */}
                {selectedDataset && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Y-Axis (Multi-select)
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedDataset.columns.map((column) => (
                        <label key={column} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={chartConfig.yAxis.includes(column)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChartConfig(prev => ({ 
                                  ...prev, 
                                  yAxis: [...prev.yAxis, column] 
                                }));
                              } else {
                                setChartConfig(prev => ({ 
                                  ...prev, 
                                  yAxis: prev.yAxis.filter(y => y !== column) 
                                }));
                              }
                            }}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{column}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chart Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    value={chartConfig.title}
                    onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Enter chart title"
                  />
                </div>

                {/* Data Filters */}
                {selectedDataset && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Data Filters</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Filter Column
                        </label>
                        <select
                          value={filterColumn}
                          onChange={(e) => setFilterColumn(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                        >
                          <option value="">No filter</option>
                          {selectedDataset.columns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {filterColumn && (
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Filter Value
                          </label>
                          <input
                            type="text"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            placeholder="Enter filter value"
                          />
                        </div>
                      )}
                      
                      {filterColumn && filterValue && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Showing {filteredData.length} filtered records
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Summary */}
            {selectedDataset && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Records:</span>
                    <span className="text-gray-900 dark:text-white">
                      {filteredData.length} / {selectedDataset.data.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Columns:</span>
                    <span className="text-gray-900 dark:text-white">{selectedDataset.columns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Uploaded:</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedDataset.uploadDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Display */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {chartConfig.title}
              </h3>
              {selectedDataset && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  {renderChart()}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <BarChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select data and configure your chart to see visualization</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};