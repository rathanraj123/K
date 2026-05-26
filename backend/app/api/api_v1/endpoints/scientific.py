from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.scientific import (
    nasa_climate_service,
    open_meteo_service,
    scientific_news_service,
    agriculture_dataset_service,
    outbreak_intelligence_service
)
from typing import Dict, Any, List

router = APIRouter()

@router.get("/news")
async def get_scientific_news():
    """Fetch global agriculture and climate news via NewsAPI."""
    return await scientific_news_service.fetch_scientific_news()

@router.get("/climate/historical")
async def get_historical_climate(lat: float = 21.0, lon: float = 78.0):
    """Fetch historical weather data via Open-Meteo for correlation."""
    return await open_meteo_service.fetch_historical_climate(lat, lon)

@router.get("/climate/risk")
async def get_climate_risk(lat: float = 21.0, lon: float = 78.0):
    """Analyze climate correlation to disease outbreaks."""
    return await open_meteo_service.analyze_climate_disease_correlation(lat, lon)

@router.get("/nasa/anomalies")
async def get_nasa_anomalies(lat: float = 21.0, lon: float = 78.0):
    """Fetch NASA EarthData anomalies for environmental stress."""
    return await nasa_climate_service.fetch_environmental_anomalies(lat, lon)

@router.get("/nasa/regional-trend")
async def get_nasa_regional_trend(region: str = "Central India"):
    """Fetch regional climate trends."""
    return await nasa_climate_service.fetch_regional_climate_trend(region)

@router.get("/regional/stats")
async def get_regional_stats():
    """Fetch dataset stats from Data.gov.in."""
    return await agriculture_dataset_service.fetch_regional_crop_stats()

@router.get("/outbreaks/heatmaps")
def get_outbreak_heatmaps(db: Session = Depends(get_db)):
    """Generate disease outbreak heatmaps based on DB scans."""
    return outbreak_intelligence_service.generate_outbreak_heatmaps(db)
