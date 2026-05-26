// This service aggregates data to generate regional agriculture reports.
// In a full production scenario, this might call a dedicated backend endpoint that fuses Data.gov.in datasets + AI predictions.

export interface RegionalReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'disease' | 'weather' | 'market' | 'advisory';
  date: string;
  region: string;
}

export const fetchRegionalReports = async (lat?: number, lon?: number): Promise<RegionalReport[]> => {
  // Simulating an API call delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Determine region roughly based on coordinates or fallback
  const regionName = lat && lon ? (lat > 20 ? "Northern Region" : "Southern Region") : "Your District";

  return [
    {
      id: "rep_1",
      title: "Blast Disease Alert",
      description: `Fungal blast disease occurrences have increased by 15% in ${regionName} over the last week. Immediate preventive fungicide application recommended.`,
      severity: "high",
      type: "disease",
      date: new Date().toISOString(),
      region: regionName
    },
    {
      id: "rep_2",
      title: "Heavy Rainfall Warning",
      description: `Unseasonal heavy rainfall expected in ${regionName} within 48 hours. Ensure proper drainage in low-lying fields.`,
      severity: "critical",
      type: "weather",
      date: new Date().toISOString(),
      region: regionName
    },
    {
      id: "rep_3",
      title: "Paddy Procurement Opening",
      description: "Government mandi centers are officially opening procurement for the Kharif season starting next Monday.",
      severity: "low",
      type: "market",
      date: new Date(Date.now() - 86400000).toISOString(),
      region: "Statewide"
    },
    {
      id: "rep_4",
      title: "Fertilizer Advisory",
      description: "Due to current soil moisture levels, split application of Nitrogen fertilizer will yield 20% better absorption.",
      severity: "medium",
      type: "advisory",
      date: new Date(Date.now() - 172800000).toISOString(),
      region: regionName
    }
  ];
};
