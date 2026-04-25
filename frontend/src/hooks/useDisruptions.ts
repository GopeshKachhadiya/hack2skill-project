import { useQuery } from '@tanstack/react-query';
import type { Disruption } from '../types';
import api from '../services/api';
import { generateMockDisruptions } from '../utils/mockData';

const MOCK = generateMockDisruptions(12);

type ApiDisruption = {
  id: string;
  location: string;
  disruption_type: string;
  predicted_severity: number;
  probability: number;
  confidence_score: number;
  predicted_time_window?: {
    start?: string;
    end?: string;
  } | null;
  recommended_action?: string | null;
  affected_shipments?: number;
  status: 'active' | 'resolved';
};

function fallbackCoords(location: string) {
  const lower = location.toLowerCase();
  if (lower.includes('shanghai')) return { lat: 31.2304, lng: 121.4737 };
  if (lower.includes('rotterdam')) return { lat: 51.9225, lng: 4.4792 };
  if (lower.includes('singapore')) return { lat: 1.2966, lng: 103.7764 };
  if (lower.includes('los angeles')) return { lat: 33.7283, lng: -118.2712 };
  if (lower.includes('mumbai')) return { lat: 18.9388, lng: 72.8354 };
  if (lower.includes('dubai') || lower.includes('jebel ali')) return { lat: 24.9857, lng: 55.0272 };
  return { lat: 20, lng: 0 };
}

function normalizeDisruption(disruption: ApiDisruption): Disruption {
  const start = disruption.predicted_time_window?.start ?? new Date().toISOString();
  const end = disruption.predicted_time_window?.end ?? new Date(Date.now() + 6 * 3600000).toISOString();

  return {
    id: disruption.id,
    location: disruption.location,
    coords: fallbackCoords(disruption.location),
    disruptionType: disruption.disruption_type as Disruption['disruptionType'],
    predictedSeverity: disruption.predicted_severity,
    probability: disruption.probability,
    predictedTimeWindow: {
      start,
      end,
    },
    confidenceScore: disruption.confidence_score,
    recommendedAction: disruption.recommended_action ?? 'Monitor situation closely.',
    affectedShipments: disruption.affected_shipments ?? 0,
    radius: 180,
    status: disruption.status,
  };
}

async function fetchDisruptions(): Promise<Disruption[]> {
  try {
    const { data } = await api.get<{ disruptions: ApiDisruption[] }>('/api/v1/disruptions');
    return data.disruptions.map(normalizeDisruption);
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
