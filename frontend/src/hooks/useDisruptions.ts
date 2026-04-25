import { useQuery } from '@tanstack/react-query';
import type { Disruption } from '../types';
import api from '../services/api';
import { generateMockDisruptions } from '../utils/mockData';

const MOCK = generateMockDisruptions(12);

async function fetchDisruptions(): Promise<Disruption[]> {
  try {
    const { data } = await api.get<{ disruptions: Disruption[] }>('/api/v1/disruptions');
    return data.disruptions;
  } catch {
    return MOCK;
  }
}

export function useDisruptions() {
  return useQuery({
    queryKey: ['disruptions'],
    queryFn: fetchDisruptions,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
