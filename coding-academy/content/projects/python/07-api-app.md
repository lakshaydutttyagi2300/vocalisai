---
id: proj-py-07-api-app
title: Weather dashboard from a web API
track: python
order: 7
difficulty: intermediate
summary: Fetch a weather forecast from a free web API (no key needed), parse the JSON, show a readable summary - and keep working offline from a cached copy.
internet: true
skills: [py-10-2-apis-http-json, py-7-2-csv-json, py-7-3-exceptions, py-5-2-fstrings-split-join, py-6-3-problem-decomposition]
starter: |
  import json

  # A saved copy of a real forecast response - you can build everything offline first.
  SAMPLE = '''{"latitude": 53.8, "longitude": -1.55,
   "daily": {"time": ["2026-06-01", "2026-06-02", "2026-06-03"],
             "temperature_2m_max": [19.4, 22.1, 17.8],
             "temperature_2m_min": [10.2, 12.5, 9.9],
             "precipitation_sum": [0.0, 3.2, 11.6]}}'''

  data = json.loads(SAMPLE)
  # your code here: print one line per day
stages:
  - name: Beginner
    description: Work with the JSON (offline).
    tasks:
      - {id: b1, text: "The program parses the sample JSON with json.loads"}
      - {id: b2, text: "It prints one line per day with date, max/min temperature and rain"}
      - {id: b3, text: "It prints the warmest day and the total rain"}
  - name: Intermediate
    description: Real requests, done safely.
    tasks:
      - {id: i1, text: "A function builds the API URL with urllib.parse.urlencode (latitude, longitude, daily fields)"}
      - {id: i2, text: "Online mode fetches the forecast with urllib.request and a timeout (run on your own computer)"}
      - {id: i3, text: "Network errors, timeouts and bad JSON are caught and the program falls back to the cached copy"}
      - {id: i4, text: "A successful response is saved to forecast_cache.json for offline use"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Ask for a city and look up its coordinates with the free geocoding API"}
      - {id: e2, text: "Give advice per day (umbrella, sunscreen, coat) with simple rules"}
      - {id: e3, text: "Only fetch again if the cache is older than 3 hours"}
---

## Goal

Learn the full API workflow - build a URL, request, check, parse, display, handle failures - with a real,
free service: **Open-Meteo** (`api.open-meteo.com`), which needs **no account and no API key** for personal
use. Nothing in this project costs money.

> **Internet needed for one stage only.** The practice lab and the sample solution run **offline** using a saved
> response. Turn on online mode (`USE_INTERNET = True`) on your own computer, when you're connected.

## Example run

```text
Forecast for 53.8, -1.55 (source: cache)
2026-06-01  max 19.4°C  min 10.2°C  rain  0.0 mm
2026-06-02  max 22.1°C  min 12.5°C  rain  3.2 mm  ☂
2026-06-03  max 17.8°C  min  9.9°C  rain 11.6 mm  ☂
Warmest day: 2026-06-02 (22.1°C). Total rain: 14.8 mm.
```

## Step-by-step plan

1. Build the display from the sample JSON first (offline): the `daily` lists line up by position - use `zip`.
2. Write `forecast_url(lat, lon)` with `urlencode`.
3. Write `fetch(url)` with `urlopen(url, timeout=10)`; return parsed JSON.
4. `get_forecast()` tries online (if enabled), saves the cache on success, and falls back to the cache (or the
   built-in sample) on any `OSError` / `ValueError`.
5. Report where the data came from (live / cache / sample).

## Hints

- URL: `https://api.open-meteo.com/v1/forecast?latitude=53.8&longitude=-1.55&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
- `urllib.error.URLError` (no internet, DNS problems) and `TimeoutError` are both subclasses of `OSError`;
  `json.JSONDecodeError` is a subclass of `ValueError`.
- `max(zip(days, maxima), key=lambda pair: pair[1])` finds the warmest day.

## Sample solution

```python
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

USE_INTERNET = False          # set to True on your own computer to fetch live data
CACHE = Path("forecast_cache.json")
SAMPLE = {"latitude": 53.8, "longitude": -1.55,
          "daily": {"time": ["2026-06-01", "2026-06-02", "2026-06-03"],
                    "temperature_2m_max": [19.4, 22.1, 17.8],
                    "temperature_2m_min": [10.2, 12.5, 9.9],
                    "precipitation_sum": [0.0, 3.2, 11.6]}}


def forecast_url(lat, lon):
    params = {"latitude": lat, "longitude": lon, "timezone": "auto",
              "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum"}
    return "https://api.open-meteo.com/v1/forecast?" + urlencode(params)


def fetch(url):
    with urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def get_forecast(lat, lon):
    if USE_INTERNET:
        try:
            data = fetch(forecast_url(lat, lon))
            CACHE.write_text(json.dumps(data), encoding="utf-8")
            return data, "live"
        except (OSError, ValueError) as err:
            print(f"Could not fetch live data ({err}); using the saved copy.")
    if CACHE.exists():
        try:
            return json.loads(CACHE.read_text(encoding="utf-8")), "cache"
        except ValueError:
            print("The cache file is damaged; using the built-in sample.")
    return SAMPLE, "sample"


def show(data, source):
    daily = data["daily"]
    days = list(zip(daily["time"], daily["temperature_2m_max"],
                    daily["temperature_2m_min"], daily["precipitation_sum"]))
    print(f"Forecast for {data['latitude']}, {data['longitude']} (source: {source})")
    for day, high, low, rain in days:
        umbrella = "  ☂" if rain >= 1 else ""
        print(f"{day}  max {high:4.1f}°C  min {low:4.1f}°C  rain {rain:4.1f} mm{umbrella}")
    warmest = max(days, key=lambda d: d[1])
    print(f"Warmest day: {warmest[0]} ({warmest[1]}°C). Total rain: {sum(d[3] for d in days):.1f} mm.")


print(forecast_url(53.8, -1.55))
show(*get_forecast(53.8, -1.55))
```

## Test your program

Offline: delete the cache and run (sample data), write rubbish into the cache file and run (should fall back).
Online (own computer): normal run, then disconnect Wi-Fi and run again (should use the cache), then try an
impossible latitude like 500 and see how the API reports the error.
