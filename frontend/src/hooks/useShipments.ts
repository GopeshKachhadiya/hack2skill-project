import { useQuery } from '@tanstack/react-query';
import type { Shipment } from '../types';
import api from '../services/api';
import { generateMockShipments } from '../utils/mockData';

const MOCK = generateMockShipments(75);

async function fetchShipments(): Promise<Shipment[]> {
  try {
    const { data } = await api.get<{ shipments: Shipment[] }>('/api/v1/shipments');
    return data.shipments;
  } catch {
    return MOCK;
  }
}

export function useShipments() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

