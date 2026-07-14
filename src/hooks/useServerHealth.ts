import { useState, useEffect } from 'react';
import { ApiClient } from '../services/apiClient';

export function useServerHealth() {
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await ApiClient.checkHealth();
      setIsServerHealthy(healthy);
    };
    checkHealth();
    
    // Optional: periodic health check
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return isServerHealthy;
}
