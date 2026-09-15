import requests
from datetime import datetime

def get_weather(city: str, date: str) -> dict:
    """
    Fetch current weather for a given city and date using Open-Meteo API.
    :param city: City name as string.
    :param date: Date string in 'YYYY-MM-DD' format.
    :return: Dictionary with temperature (°C) and conditions (weather code description).
    """
    # Geocode city to latitude and longitude
    geo_url = "https://geocoding-api.open-meteo.com/v1/search"
    geo_params = {"name": city, "count": 1}
    geo_resp = requests.get(geo_url, params=geo_params)
    geo_resp.raise_for_status()
    geo_data = geo_resp.json()
    if not geo_data.get("results"):
        raise ValueError(f"City '{city}' not found.")
    lat = geo_data["results"][0]["latitude"]
    lon = geo_data["results"][0]["longitude"]

    # Fetch weather forecast
    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "timezone": "auto",
        "start_date": date,
        "end_date": date,
    }
    weather_resp = requests.get(weather_url, params=weather_params)
    weather_resp.raise_for_status()
    weather_data = weather_resp.json()
    daily = weather_data.get("daily", {})
    if not daily:
        raise ValueError("No weather data returned.")
    # Get first day's data
    temp_max = daily["temperature_2m_max"][0]
    temp_min = daily["temperature_2m_min"][0]
    temp = (temp_max + temp_min) / 2  # average
    weathercode = daily["weathercode"][0]
    # Map weather code to simple condition (basic mapping)
    condition_map = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    condition = condition_map.get(weathercode, "Unknown")
    return {
        "temperature": round(temp, 1),
        "condition": condition,
    }