import { ClusterInfo, ClusterCode } from '../types/auth';

export const FROO_CLUSTERS: Record<ClusterCode, ClusterInfo> = {
  NLC: {
    code: 'NLC',
    name: 'North Luzon Cluster (NLC)',
    fullName: 'North Luzon Cluster',
    regions: ['Region 1', 'Region 2', 'Region 3', 'Region CAR'],
  },
  SLC: {
    code: 'SLC',
    name: 'South Luzon Cluster (SLC)',
    fullName: 'South Luzon Cluster',
    regions: ['Region 4A', 'Region 4B', 'Region NCR', 'Region 5'],
  },
  VC: {
    code: 'VC',
    name: 'Visayas Cluster (VC)',
    fullName: 'Visayas Cluster',
    regions: ['Region 6', 'Region 7', 'Region 8'],
  },
  MEC: {
    code: 'MEC',
    name: 'Mindanao East Cluster (MEC)',
    fullName: 'Mindanao East Cluster',
    regions: ['Region 10', 'Region 11', 'Region 13'],
  },
  MWC: {
    code: 'MWC',
    name: 'Mindanao West Cluster (MWC)',
    fullName: 'Mindanao West Cluster',
    regions: ['Region 9', 'Region 12 / BARMM'],
  },
};

export const CLUSTERS_LIST: ClusterInfo[] = Object.values(FROO_CLUSTERS);

export function getClusterForRegion(regionCode: string): ClusterInfo | undefined {
  const norm = regionCode.trim().toLowerCase();
  return CLUSTERS_LIST.find((c) =>
    c.regions.some((r) => r.toLowerCase() === norm || norm.includes(r.toLowerCase()))
  );
}

export function getRegionsForCluster(clusterCode: ClusterCode): string[] {
  return FROO_CLUSTERS[clusterCode]?.regions || [];
}
