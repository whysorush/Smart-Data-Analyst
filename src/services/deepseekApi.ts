interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class DeepSeekAPI {
  private apiKey: string;

  constructor() {
    const storedKey = localStorage.getItem('deepseekApiKey');
    this.apiKey = storedKey || '';
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('deepseekApiKey', key);
  }

  getApiKey(): string {
    return this.apiKey;
  }
  private baseURL = 'https://api.deepseek.com';
  private model = 'deepseek-chat';

  async generateInsights(data: any[], context: string): Promise<string> {
    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: 'You are an expert business analyst. Analyze the provided data and generate actionable insights, trends, and recommendations. Focus on key patterns, anomalies, and business implications. Provide specific, data-driven insights.Price will be in INR'
        },
        {
          role: 'user',
          content: `Analyze this business data and provide insights: ${context}\n\nData sample: ${JSON.stringify(data.slice(0, 10), null, 2)}\n\nTotal records: ${data.length}`
        }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 5000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result: DeepSeekResponse = await response.json();
      return result.choices[0]?.message?.content || 'Unable to generate insights';
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to generate AI insights. Please check your connection and try again.');
    }
  }

  async generateKPIRecommendations(kpis: any[]): Promise<string> {
    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: 'You are a business intelligence expert. Analyze KPIs and provide strategic recommendations for improvement. Price will be in INR'
        },
        {
          role: 'user',
          content: `Analyze these KPIs and provide recommendations: ${JSON.stringify(kpis, null, 2)}`
        }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result: DeepSeekResponse = await response.json();
      return result.choices[0]?.message?.content || 'Unable to generate recommendations';
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to generate KPI recommendations.');
    }
  }

  async predictChartType(columns: string[], dataSample: any[]): Promise<string> {
    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: 'You are a data visualization expert. Analyze the provided data structure and recommend the most suitable chart type. Respond with only one word: "line", "bar", "pie", "area", or "scatter".Price will be in INR'
        },
        {
          role: 'user',
          content: `Analyze this data and recommend the best chart type:

Columns: ${columns.join(', ')}

Sample data:
${JSON.stringify(dataSample.slice(0, 5), null, 2)}

Total columns: ${columns.length}
Data types: ${columns.map(col => {
            const sampleValue = dataSample[0]?.[col];
            return `${col}: ${typeof sampleValue === 'number' ? 'numeric' : 'text'}`;
          }).join(', ')}

Recommend the most suitable chart type for this data structure.`
        }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: 50
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result: DeepSeekResponse = await response.json();
      const prediction = result.choices[0]?.message?.content?.toLowerCase().trim() || 'bar';

      // Validate the prediction is one of our supported types
      const validTypes = ['line', 'bar', 'pie', 'area', 'scatter'];
      return validTypes.includes(prediction) ? prediction : 'bar';
    } catch (error) {
      console.error('DeepSeek chart prediction error:', error);
      return 'bar'; // Default fallback
    }
  }
}

export const deepseekApi = new DeepSeekAPI();