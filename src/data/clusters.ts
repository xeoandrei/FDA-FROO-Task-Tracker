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
  const norm = (regionCode || '').trim().toLowerCase();
  if (!norm) return undefined;

  // Normalize "RFO 1" -> "region 1", "CAR" -> "region car", "NCR" -> "region ncr", "Region 13 (Caraga)" -> "region 13"
  const rfoMatch = norm.match(/^(?:rfo|region)[\s-]*([0-9]+[ab]?|car|ncr)\b/i);
  const canonical =
    norm === 'car' || norm.includes('cordillera')
      ? 'region car'
      : norm === 'ncr' || norm.includes('field office - ncr')
      ? 'region ncr'
      : norm.includes('region 12') || norm.includes('barmm') || norm.includes('soccksargen')
      ? 'region 12 / barmm'
      : norm.includes('region 13') || norm.includes('caraga')
      ? 'region 13'
      : rfoMatch
      ? `region ${rfoMatch[1].toLowerCase()}`
      : norm;

  return CLUSTERS_LIST.find((c) =>
    c.regions.some((r) => r.toLowerCase() === canonical || r.toLowerCase() === norm)
  );
}

export function getRegionsForCluster(clusterCode: ClusterCode): string[] {
  return FROO_CLUSTERS[clusterCode]?.regions || [];
}

export function resolveUserClusterCode(user: {
  cluster?: ClusterCode | string | null;
  office?: string | null;
}): ClusterCode {
  const rawCluster = String(user?.cluster || '').trim().toUpperCase();
  if (rawCluster === 'VBC') return 'VC';
  if (rawCluster in FROO_CLUSTERS) {
    return rawCluster as ClusterCode;
  }

  const office = String(user?.office || '').trim();
  const officeUpper = office.toUpperCase();
  const officeLower = office.toLowerCase();

  if (officeUpper.includes('NLC') || officeLower.includes('north luzon')) return 'NLC';
  if (officeUpper.includes('SLC') || officeLower.includes('south luzon')) return 'SLC';
  if (officeUpper.includes('VC') || officeUpper.includes('VBC') || officeLower.includes('visayas')) return 'VC';
  if (officeUpper.includes('MEC') || officeLower.includes('mindanao east')) return 'MEC';
  if (officeUpper.includes('MWC') || officeLower.includes('mindanao west')) return 'MWC';

  const byRegion = getClusterForRegion(office);
  if (byRegion) return byRegion.code;

  return 'NLC';
}

