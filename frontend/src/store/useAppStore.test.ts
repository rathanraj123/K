import { describe, expect, it } from 'vitest';
import { mapBackendToScanResult } from './useAppStore';

describe('mapBackendToScanResult', () => {
  it('maps backend snake_case scan results into the frontend model', () => {
    const result = mapBackendToScanResult({
      id: 'scan-1',
      image_url: '/api/v1/uploads/leaf.jpg',
      detected_disease: 'bacterial_leaf_blight',
      confidence: 0.87,
      severity: 'High',
      created_at: '2026-05-14T10:00:00Z',
      crop_type: 'Rice',
      cosmetic_insights: [{ compound: 'Chlorophyll A', use_case: 'Stress marker' }],
      scientific_name: 'Xanthomonas oryzae',
      disease_category: 'bacterial',
      spread_risk: 'high',
      contagiousness: 'Field spread possible',
      crop_stage_affected: 'vegetative',
      scan_latitude: 17.385,
      scan_longitude: 78.4867,
    });

    expect(result).toMatchObject({
      id: 'scan-1',
      imageUrl: 'http://localhost:8000/api/v1/uploads/leaf.jpg',
      diseaseName: 'bacterial_leaf_blight',
      confidence: 87,
      severity: 'high',
      cropType: 'Rice',
      cosmeticInsights: [{ compound: 'Chlorophyll A', useCase: 'Stress marker' }],
      diseaseIdentity: {
        display_name: 'Bacterial Leaf Blight',
        scientific_name: 'Xanthomonas oryzae',
        disease_category: 'bacterial',
        spread_risk: 'high',
      },
      scanLatitude: 17.385,
      scanLongitude: 78.4867,
    });
  });

  it('uses the local preview URL for scans that are still being processed', () => {
    const result = mapBackendToScanResult({
      id: 'scan-2',
      status: 'processing',
      severity: 'None',
    }, 'blob:http://localhost/preview');

    expect(result.imageUrl).toBe('blob:http://localhost/preview');
    expect(result.severity).toBe('low');
    expect(result.diseaseName).toBe('Unknown');
  });
});
