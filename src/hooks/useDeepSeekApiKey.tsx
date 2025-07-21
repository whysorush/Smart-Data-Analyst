import { useState, useEffect } from 'react';
import { deepseekApi } from '../services/deepseekApi';

export function useDeepSeekApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => deepseekApi.getApiKey());

  useEffect(() => {
    deepseekApi.setApiKey(apiKey);
  }, [apiKey]);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
  };

  return { apiKey, setApiKey };
}