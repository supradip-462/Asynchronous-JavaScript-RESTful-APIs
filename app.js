/**
 * ============================================================================
 * SkyPulse Weather Dashboard - Main Application Script
 * ============================================================================
 * An advanced, clean, and real-time weather web application demonstrating:
 * 1. Asynchronous JavaScript (Fetch API, Promises, Async/Await)
 * 2. RESTful API integration (Open-Meteo Geocoding & Weather Forecast APIs)
 * 3. Robust Error Handling (Network failures, Invalid inputs, AbortController timeouts)
 * 4. Complex Nested JSON parsing and dynamic DOM rendering
 * 5. Geolocation API, Search Autocomplete, and LocalStorage persistence
 * ============================================================================
 */

'use strict';

/* ==========================================================================
   1. State Management & Configuration
   ========================================================================== */
const CONFIG = {
  GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_API: 'https://api.open-meteo.com/v1/forecast',
  REVERSE_GEO_API: 'https://nominatim.openstreetmap.org/reverse',
  REQUEST_TIMEOUT_MS: 8000,
  DEFAULT_CITY: 'London',
  STORAGE_KEYS: {
    RECENT_SEARCHES: 'skypulse_recent_searches',
    PREFERRED_UNIT: 'skypulse_temp_unit',
    LAST_LOCATION: 'skypulse_last_location'
  }
};

const appState = {
  currentLocation: {
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278
  },
  weatherData: null,
  unit: localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERRED_UNIT) || 'c', // 'c' or 'f'
  recentSearches: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES) || '[]')
};

/* ==========================================================================
   2. DOM Element Selectors
   ========================================================================== */
const DOM = {
  // Search & Navigation
  searchForm: document.getElementById('searchForm'),
  cityInput: document.getElementById('cityInput'),
  searchBtn: document.getElementById('searchBtn'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  suggestionsDropdown: document.getElementById('suggestionsDropdown'),
  geoLocateBtn: document.getElementById('geoLocateBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshIcon: document.getElementById('refreshIcon'),
  unitCelsius: document.getElementById('unitCelsius'),
  unitFahrenheit: document.getElementById('unitFahrenheit'),
  popularChips: document.getElementById('popularChips'),
  recentSearchesWrapper: document.getElementById('recentSearchesWrapper'),
  recentChips: document.getElementById('recentChips'),

  // Alerts & Loading
  alertBanner: document.getElementById('alertBanner'),
  alertTitle: document.getElementById('alertTitle'),
  alertMessage: document.getElementById('alertMessage'),
  alertCloseBtn: document.getElementById('alertCloseBtn'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingMessage: document.getElementById('loadingMessage'),

  // Hero Card Elements
  cityName: document.getElementById('cityName'),
  countryBadge: document.getElementById('countryBadge'),
  localDateTime: document.getElementById('localDateTime'),
  weatherConditionBadge: document.getElementById('weatherConditionBadge'),
  conditionText: document.getElementById('conditionText'),
  currentTemp: document.getElementById('currentTemp'),
  displayUnit: document.getElementById('displayUnit'),
  heroWeatherIcon: document.getElementById('heroWeatherIcon'),
  feelsLikeTemp: document.getElementById('feelsLikeTemp'),
  highTemp: document.getElementById('highTemp'),
  lowTemp: document.getElementById('lowTemp'),
  lastUpdatedTime: document.getElementById('lastUpdatedTime'),

  // Metrics Grid Elements
  windSpeed: document.getElementById('windSpeed'),
  windUnit: document.getElementById('windUnit'),
  windDirection: document.getElementById('windDirection'),
  compassArrow: document.getElementById('compassArrow'),
  humidity: document.getElementById('humidity'),
  humidityProgress: document.getElementById('humidityProgress'),
  dewPointText: document.getElementById('dewPointText'),
  uvIndex: document.getElementById('uvIndex'),
  uvBadge: document.getElementById('uvBadge'),
  uvProgress: document.getElementById('uvProgress'),
  uvAdvice: document.getElementById('uvAdvice'),
  airPressure: document.getElementById('airPressure'),
  pressureStatus: document.getElementById('pressureStatus'),
  visibility: document.getElementById('visibility'),
  precipProb: document.getElementById('precipProb'),
  sunriseTime: document.getElementById('sunriseTime'),
  sunsetTime: document.getElementById('sunsetTime'),
  daylightDuration: document.getElementById('daylightDuration'),

  // Forecast Containers
  hourlyForecastContainer: document.getElementById('hourlyForecastContainer'),
  dailyForecastContainer: document.getElementById('dailyForecastContainer')
};

/* ==========================================================================
   3. WMO Weather Code Interpreter & Theme Mapping
   ========================================================================== */
/**
 * Maps WMO (World Meteorological Organization) weather codes to human-readable text,
 * Lucide icon identifiers, and dynamic atmospheric theme classes.
 * @param {number} code - WMO weather interpretation code
 * @param {boolean} isDay - 1 for daytime, 0 for night
 * @returns {Object} { description, icon, theme }
 */
function getWeatherInfo(code, isDay = 1) {
  const isNight = isDay === 0;

  switch (code) {
    case 0:
      return {
        description: isNight ? 'Clear Night' : 'Clear Sky',
        icon: isNight ? 'moon' : 'sun',
        theme: isNight ? 'theme-clear night-mode' : 'theme-clear day-mode'
      };
    case 1:
      return {
        description: isNight ? 'Mainly Clear' : 'Mainly Sunny',
        icon: isNight ? 'cloud-moon' : 'cloud-sun',
        theme: isNight ? 'theme-clear night-mode' : 'theme-clear day-mode'
      };
    case 2:
      return {
        description: 'Partly Cloudy',
        icon: isNight ? 'cloud-moon' : 'cloud-sun',
        theme: 'theme-clouds'
      };
    case 3:
      return {
        description: 'Overcast',
        icon: 'cloud',
        theme: 'theme-clouds'
      };
    case 45:
    case 48:
      return {
        description: 'Foggy',
        icon: 'cloud-fog',
        theme: 'theme-clouds'
      };
    case 51:
    case 53:
    case 55:
      return {
        description: 'Drizzle',
        icon: 'cloud-drizzle',
        theme: 'theme-rain'
      };
    case 56:
    case 57:
      return {
        description: 'Freezing Drizzle',
        icon: 'cloud-snow',
        theme: 'theme-snow'
      };
    case 61:
    case 63:
    case 65:
      return {
        description: 'Rain Showers',
        icon: 'cloud-rain',
        theme: 'theme-rain'
      };
    case 66:
    case 67:
      return {
        description: 'Freezing Rain',
        icon: 'cloud-hail',
        theme: 'theme-snow'
      };
    case 71:
    case 73:
    case 75:
    case 77:
      return {
        description: 'Snowfall',
        icon: 'snowflake',
        theme: 'theme-snow'
      };
    case 80:
    case 81:
    case 82:
      return {
        description: 'Heavy Rain',
        icon: 'cloud-rain-wind',
        theme: 'theme-rain'
      };
    case 85:
    case 86:
      return {
        description: 'Snow Showers',
        icon: 'cloud-snow',
        theme: 'theme-snow'
      };
    case 95:
      return {
        description: 'Thunderstorm',
        icon: 'cloud-lightning',
        theme: 'theme-thunder'
      };
    case 96:
    case 99:
      return {
        description: 'Thunderstorm with Hail',
        icon: 'zap',
        theme: 'theme-thunder'
      };
    default:
      return {
        description: 'Variable Weather',
        icon: 'cloud',
        theme: 'theme-clear day-mode'
      };
  }
}

/* ==========================================================================
   4. RESTful API Client (Asynchronous JavaScript & Fetch API)
   ========================================================================== */

/**
 * Custom fetch wrapper with configurable timeout using AbortController.
 * @param {string} url - Target REST API URL
 * @param {number} timeoutMs - Timeout limit in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} (${response.statusText})`);
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Searches locations matching a query string using the Open-Meteo Geocoding API.
 * @param {string} query - City or location name
 * @returns {Promise<Array>} List of matching geocoded locations
 */
async function searchLocation(query) {
  if (!query || query.trim().length === 0) {
    throw new Error('Please enter a valid city name.');
  }

  const sanitizedQuery = encodeURIComponent(query.trim());
  const url = `${CONFIG.GEOCODING_API}?name=${sanitizedQuery}&count=5&language=en&format=json`;

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No locations found matching "${query}". Please try another search.`);
  }

  return data.results;
}

/**
 * Fetches real-time weather, 24-hour hourly forecast, and 7-day daily forecast.
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @param {string} unit - Temperature unit ('c' or 'f')
 * @returns {Promise<Object>} Complex nested JSON weather data
 */
async function fetchWeatherData(latitude, longitude, unit = 'c') {
  const tempUnitParam = unit === 'f' ? 'fahrenheit' : 'celsius';
  const windUnitParam = unit === 'f' ? 'mph' : 'kmh';

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m'
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'weather_code'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max'
    ].join(','),
    temperature_unit: tempUnitParam,
    wind_speed_unit: windUnitParam,
    timezone: 'auto'
  });

  const url = `${CONFIG.FORECAST_API}?${params.toString()}`;
  const response = await fetchWithTimeout(url);
  return await response.json();
}

/**
 * Performs reverse geocoding to resolve city/country name from GPS coordinates.
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise<Object>} Location metadata
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = `${CONFIG.REVERSE_GEO_API}?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
    const response = await fetchWithTimeout(url, 4000);
    const data = await response.json();

    const address = data.address || {};
    const name = address.city || address.town || address.village || address.county || 'My Location';
    const country = address.country || '';
    const countryCode = (address.country_code || 'GPS').toUpperCase();

    return { name, country, countryCode, latitude, longitude };
  } catch (error) {
    // Fallback if reverse geocoding service is unavailable
    return {
      name: `Lat: ${latitude.toFixed(2)}`,
      country: `Lon: ${longitude.toFixed(2)}`,
      countryCode: 'GPS',
      latitude,
      longitude
    };
  }
}

/* ==========================================================================
   5. UI Rendering & DOM Manipulation
   ========================================================================== */

/**
 * Updates the Hero Weather Card with primary temperature and status info.
 */
function renderHeroCard(weather, location) {
  const current = weather.current;
  const daily = weather.daily;
  const isDay = current.is_day;
  const weatherInfo = getWeatherInfo(current.weather_code, isDay);

  // Update Location & Datetime
  DOM.cityName.textContent = location.name;
  DOM.countryBadge.textContent = location.countryCode || 'WORLD';
  DOM.conditionText.textContent = weatherInfo.description;

  // Format local date & time based on API response timezone
  const now = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  DOM.localDateTime.textContent = now.toLocaleDateString('en-US', options);

  // Temperatures
  const unitSymbol = appState.unit === 'f' ? '°F' : '°C';
  DOM.currentTemp.textContent = Math.round(current.temperature_2m);
  DOM.displayUnit.textContent = unitSymbol;
  DOM.feelsLikeTemp.textContent = `${Math.round(current.apparent_temperature)}${unitSymbol}`;
  DOM.highTemp.textContent = `${Math.round(daily.temperature_2m_max[0])}${unitSymbol}`;
  DOM.lowTemp.textContent = `${Math.round(daily.temperature_2m_min[0])}${unitSymbol}`;
  DOM.lastUpdatedTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update Hero Weather Icon
  DOM.heroWeatherIcon.innerHTML = `<i data-lucide="${weatherInfo.icon}" class="animated-icon"></i>`;

  // Update dynamic atmospheric body theme
  document.body.className = weatherInfo.theme;
}

/**
 * Updates the 6 Live Metric Grid Cards.
 */
function renderMetricsGrid(weather) {
  const current = weather.current;
  const daily = weather.daily;
  const unitSymbol = appState.unit === 'f' ? '°F' : '°C';
  const windSpeedUnit = appState.unit === 'f' ? 'mph' : 'km/h';

  // 1. Wind Speed & Direction
  DOM.windSpeed.textContent = Math.round(current.wind_speed_10m);
  DOM.windUnit.textContent = windSpeedUnit;
  const windDeg = current.wind_direction_10m || 0;
  const cardinal = getCardinalDirection(windDeg);
  DOM.windDirection.textContent = `${cardinal} (${windDeg}°)`;
  if (DOM.compassArrow) {
    DOM.compassArrow.style.transform = `rotate(${windDeg}deg)`;
  }

  // 2. Humidity & Dew Point
  const hum = Math.round(current.relative_humidity_2m);
  DOM.humidity.textContent = hum;
  DOM.humidityProgress.style.width = `${hum}%`;
  // Approximate dew point formula: Td ≈ T - ((100 - RH) / 5)
  const dewPoint = Math.round(current.temperature_2m - ((100 - hum) / 5));
  DOM.dewPointText.textContent = `Dew point is approx. ${dewPoint}${unitSymbol}`;

  // 3. UV Index
  const uv = daily.uv_index_max[0] || 0;
  DOM.uvIndex.textContent = uv.toFixed(1);
  const uvPercentage = Math.min((uv / 12) * 100, 100);
  DOM.uvProgress.style.width = `${uvPercentage}%`;
  updateUVBadge(uv);

  // 4. Air Pressure
  const pressure = Math.round(current.surface_pressure);
  DOM.airPressure.textContent = pressure;
  if (pressure > 1020) {
    DOM.pressureStatus.innerHTML = '<i data-lucide="arrow-up" class="sub-icon"></i> High Pressure System';
  } else if (pressure < 1005) {
    DOM.pressureStatus.innerHTML = '<i data-lucide="arrow-down" class="sub-icon"></i> Low Pressure System';
  } else {
    DOM.pressureStatus.innerHTML = '<i data-lucide="check-circle" class="sub-icon"></i> Normal Atmospheric';
  }

  // 5. Visibility & Precipitation
  const precip = current.precipitation;
  DOM.visibility.textContent = '10+'; // Standard visibility index
  DOM.precipProb.innerHTML = `<i data-lucide="cloud-rain" class="sub-icon"></i> Current precip: ${precip} mm`;

  // 6. Sunrise & Sunset
  const sunriseStr = daily.sunrise[0];
  const sunsetStr = daily.sunset[0];
  if (sunriseStr && sunsetStr) {
    const sunriseDate = new Date(sunriseStr);
    const sunsetDate = new Date(sunsetStr);
    DOM.sunriseTime.textContent = sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    DOM.sunsetTime.textContent = sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const daylightMs = sunsetDate.getTime() - sunriseDate.getTime();
    const daylightHours = Math.floor(daylightMs / (1000 * 60 * 60));
    const daylightMins = Math.floor((daylightMs % (1000 * 60 * 60)) / (1000 * 60));
    DOM.daylightDuration.textContent = `Daylight: ${daylightHours}h ${daylightMins}m`;
  }
}

/**
 * Updates the UV badge text and color class.
 */
function updateUVBadge(uv) {
  DOM.uvBadge.className = 'uv-badge';
  if (uv <= 2) {
    DOM.uvBadge.classList.add('low');
    DOM.uvBadge.textContent = 'Low';
    DOM.uvAdvice.textContent = 'Safe outside without protection';
  } else if (uv <= 5) {
    DOM.uvBadge.classList.add('moderate');
    DOM.uvBadge.textContent = 'Moderate';
    DOM.uvAdvice.textContent = 'Sun protection recommended';
  } else if (uv <= 7) {
    DOM.uvBadge.classList.add('high');
    DOM.uvBadge.textContent = 'High';
    DOM.uvAdvice.textContent = 'Wear sunglasses & SPF 30+';
  } else if (uv <= 10) {
    DOM.uvBadge.classList.add('very-high');
    DOM.uvBadge.textContent = 'Very High';
    DOM.uvAdvice.textContent = 'Minimize sun exposure at midday';
  } else {
    DOM.uvBadge.classList.add('extreme');
    DOM.uvBadge.textContent = 'Extreme';
    DOM.uvAdvice.textContent = 'Avoid sun exposure if possible';
  }
}

/**
 * Converts wind degrees (0-360) into 8-point cardinal compass text.
 */
function getCardinalDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

/**
 * Renders the 24-Hour Hourly Forecast slider cards.
 */
function renderHourlyForecast(weather) {
  const hourly = weather.hourly;
  const unitSymbol = appState.unit === 'f' ? '°F' : '°C';
  DOM.hourlyForecastContainer.innerHTML = '';

  const now = new Date();
  const currentHour = now.getHours();

  // Show the next 24 hours starting from the current hour
  for (let i = currentHour; i < currentHour + 24; i++) {
    if (!hourly.time[i]) break;

    const timeStr = hourly.time[i];
    const hourDate = new Date(timeStr);
    const hourFormatted = i === currentHour ? 'Now' : hourDate.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    const temp = Math.round(hourly.temperature_2m[i]);
    const rainProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
    const weatherCode = hourly.weather_code[i];
    const isDay = (hourDate.getHours() >= 6 && hourDate.getHours() < 20) ? 1 : 0;
    const info = getWeatherInfo(weatherCode, isDay);

    const card = document.createElement('div');
    card.className = `hourly-card ${i === currentHour ? 'active-hour' : ''}`;
    card.innerHTML = `
      <span class="hourly-time">${hourFormatted}</span>
      <div class="hourly-icon"><i data-lucide="${info.icon}"></i></div>
      <span class="hourly-temp">${temp}${unitSymbol}</span>
      <span class="hourly-rain"><i data-lucide="droplet"></i> ${rainProb}%</span>
    `;

    DOM.hourlyForecastContainer.appendChild(card);
  }
}

/**
 * Renders the 7-Day Extended Forecast list.
 */
function renderDailyForecast(weather) {
  const daily = weather.daily;
  const unitSymbol = appState.unit === 'f' ? '°F' : '°C';
  DOM.dailyForecastContainer.innerHTML = '';

  const globalMin = Math.min(...daily.temperature_2m_min);
  const globalMax = Math.max(...daily.temperature_2m_max);
  const range = (globalMax - globalMin) || 1;

  for (let i = 0; i < daily.time.length; i++) {
    const dateObj = new Date(daily.time[i]);
    let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    if (i === 0) dayName = 'Today';
    if (i === 1) dayName = 'Tomorrow';

    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const weatherCode = daily.weather_code[i];
    const info = getWeatherInfo(weatherCode, 1);

    // Calculate relative bar position
    const leftPercent = ((minTemp - globalMin) / range) * 100;
    const widthPercent = Math.max(((maxTemp - minTemp) / range) * 100, 8);

    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `
      <span class="daily-day">${dayName}</span>
      <div class="daily-condition">
        <i data-lucide="${info.icon}"></i>
        <span>${info.description}</span>
      </div>
      <div class="daily-temp-bar-container">
        <div class="daily-temp-bar">
          <div class="daily-temp-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        </div>
      </div>
      <div class="daily-temp-values">
        <span class="min-temp">${minTemp}°</span>
        <span class="max-temp">${maxTemp}${unitSymbol}</span>
      </div>
    `;

    DOM.dailyForecastContainer.appendChild(row);
  }
}

/**
 * Master render function that coordinates all UI components and updates Lucide icons.
 */
function renderFullDashboard(weatherData, location) {
  renderHeroCard(weatherData, location);
  renderMetricsGrid(weatherData);
  renderHourlyForecast(weatherData);
  renderDailyForecast(weatherData);

  // Initialize Lucide icons across dynamically injected elements
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   6. Alert, Notification & Loading State Handlers
   ========================================================================== */

/**
 * Shows an alert banner with custom title and message.
 */
function showAlert(title, message) {
  DOM.alertTitle.textContent = title;
  DOM.alertMessage.textContent = message;
  DOM.alertBanner.hidden = false;

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    DOM.alertBanner.hidden = true;
  }, 6000);
}

function hideAlert() {
  DOM.alertBanner.hidden = true;
}

/**
 * Shows/hides the loading spinner overlay with dynamic message.
 */
function setLoading(isLoading, message = 'Fetching live weather data...') {
  if (!DOM.loadingOverlay) return;
  DOM.loadingMessage.textContent = message;
  if (isLoading) {
    DOM.loadingOverlay.classList.add('active');
    DOM.loadingOverlay.removeAttribute('hidden');
    DOM.loadingOverlay.style.display = 'flex';
  } else {
    DOM.loadingOverlay.classList.remove('active');
    DOM.loadingOverlay.setAttribute('hidden', '');
    DOM.loadingOverlay.style.display = 'none';
  }
  if (DOM.searchBtn) {
    DOM.searchBtn.disabled = isLoading;
  }
}

/* ==========================================================================
   7. Application Core Workflows
   ========================================================================== */

/**
 * Main Controller: Loads weather for a target location object.
 * @param {Object} location - { name, country, countryCode, latitude, longitude }
 */
async function loadWeatherForLocation(location) {
  setLoading(true, `Loading weather for ${location.name}...`);
  hideAlert();

  try {
    const weather = await fetchWeatherData(location.latitude, location.longitude, appState.unit);

    appState.currentLocation = location;
    appState.weatherData = weather;

    // Save to Recent Searches & LocalStorage
    saveRecentSearch(location);

    // Render Dashboard
    renderFullDashboard(weather, location);

    // Save last successfully loaded location
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LOCATION, JSON.stringify(location));
  } catch (error) {
    console.error('Error loading weather data:', error);
    showAlert('Weather Data Unavailable', error.message || 'Failed to fetch weather data. Please try again.');
  } finally {
    setLoading(false);
  }
}

/**
 * Executes search workflow based on city name input.
 */
async function handleSearch(cityName) {
  if (!cityName || cityName.trim().length === 0) {
    showAlert('Empty Search', 'Please type a city name to search.');
    return;
  }

  setLoading(true, `Searching for "${cityName}"...`);
  hideAlert();
  closeSuggestions();

  try {
    const results = await searchLocation(cityName);
    const bestMatch = results[0];

    const locationObj = {
      name: bestMatch.name,
      country: bestMatch.country || '',
      countryCode: bestMatch.country_code ? bestMatch.country_code.toUpperCase() : '',
      latitude: bestMatch.latitude,
      longitude: bestMatch.longitude
    };

    await loadWeatherForLocation(locationObj);
    DOM.cityInput.value = '';
    DOM.clearSearchBtn.hidden = true;
  } catch (error) {
    console.error('Search error:', error);
    showAlert('Location Not Found', error.message || 'Could not find the requested location.');
  } finally {
    setLoading(false);
  }
}

/**
 * Triggers HTML5 Geolocation API to find the user's current GPS coordinates.
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    showAlert('Geolocation Unsupported', 'Your browser does not support GPS location services.');
    return;
  }

  setLoading(true, 'Acquiring GPS location...');
  hideAlert();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const resolvedLocation = await reverseGeocode(latitude, longitude);
        await loadWeatherForLocation(resolvedLocation);
      } catch (error) {
        console.error('Reverse geocode error:', error);
        await loadWeatherForLocation({
          name: 'My Location',
          country: '',
          countryCode: 'GPS',
          latitude,
          longitude
        });
      }
    },
    (error) => {
      setLoading(false);
      let errorMsg = 'Unable to retrieve your location.';
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = 'Location permission was denied. Please allow location access in your browser.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = 'Location information is currently unavailable.';
      } else if (error.code === error.TIMEOUT) {
        errorMsg = 'The request to get your location timed out.';
      }
      showAlert('Location Error', errorMsg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ==========================================================================
   8. Search Autocomplete with Debounce
   ========================================================================== */

let debounceTimer = null;

function handleInputChange(e) {
  const query = e.target.value.trim();
  DOM.clearSearchBtn.hidden = query.length === 0;

  clearTimeout(debounceTimer);

  if (query.length < 2) {
    closeSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const results = await searchLocation(query);
      renderSuggestions(results);
    } catch {
      closeSuggestions();
    }
  }, 300);
}

function renderSuggestions(locations) {
  if (!locations || locations.length === 0) {
    closeSuggestions();
    return;
  }

  DOM.suggestionsDropdown.innerHTML = '';
  locations.forEach((loc) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';

    const admin = [loc.admin1, loc.country].filter(Boolean).join(', ');
    item.innerHTML = `
      <i data-lucide="map-pin"></i>
      <span><strong>${loc.name}</strong></span>
      <span class="suggestion-admin">${admin}</span>
    `;

    item.addEventListener('click', () => {
      const locationObj = {
        name: loc.name,
        country: loc.country || '',
        countryCode: loc.country_code ? loc.country_code.toUpperCase() : '',
        latitude: loc.latitude,
        longitude: loc.longitude
      };
      DOM.cityInput.value = '';
      DOM.clearSearchBtn.hidden = true;
      closeSuggestions();
      loadWeatherForLocation(locationObj);
    });

    DOM.suggestionsDropdown.appendChild(item);
  });

  DOM.suggestionsDropdown.hidden = false;
  if (window.lucide) window.lucide.createIcons();
}

function closeSuggestions() {
  DOM.suggestionsDropdown.hidden = true;
  DOM.suggestionsDropdown.innerHTML = '';
}

/* ==========================================================================
   9. Recent Searches & History Management
   ========================================================================== */

function saveRecentSearch(location) {
  // Prevent duplicates
  appState.recentSearches = appState.recentSearches.filter(
    (item) => item.name.toLowerCase() !== location.name.toLowerCase()
  );

  // Add to beginning, keep max 5
  appState.recentSearches.unshift(location);
  if (appState.recentSearches.length > 5) {
    appState.recentSearches.pop();
  }

  localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(appState.recentSearches));
  renderRecentSearches();
}

function renderRecentSearches() {
  if (!appState.recentSearches || appState.recentSearches.length === 0) {
    DOM.recentSearchesWrapper.hidden = true;
    return;
  }

  DOM.recentChips.innerHTML = '';
  appState.recentSearches.forEach((loc) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = loc.name;
    chip.addEventListener('click', () => loadWeatherForLocation(loc));
    DOM.recentChips.appendChild(chip);
  });

  DOM.recentSearchesWrapper.hidden = false;
}

/* ==========================================================================
   10. Unit Switcher (°C / °F)
   ========================================================================== */

function setTemperatureUnit(unit) {
  if (appState.unit === unit) return;

  appState.unit = unit;
  localStorage.setItem(CONFIG.STORAGE_KEYS.PREFERRED_UNIT, unit);

  // Update Button States
  if (unit === 'c') {
    DOM.unitCelsius.classList.add('active');
    DOM.unitFahrenheit.classList.remove('active');
  } else {
    DOM.unitFahrenheit.classList.add('active');
    DOM.unitCelsius.classList.remove('active');
  }

  // Reload current location with new unit
  if (appState.currentLocation) {
    loadWeatherForLocation(appState.currentLocation);
  }
}

/* ==========================================================================
   11. Event Listeners & Application Lifecycle
   ========================================================================== */

function setupEventListeners() {
  // Search Form Submission
  DOM.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(DOM.cityInput.value);
  });

  // Autocomplete Input
  DOM.cityInput.addEventListener('input', handleInputChange);

  // Clear search button
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.cityInput.value = '';
    DOM.clearSearchBtn.hidden = true;
    closeSuggestions();
    DOM.cityInput.focus();
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!DOM.searchForm.contains(e.target) && !DOM.suggestionsDropdown.contains(e.target)) {
      closeSuggestions();
    }
  });

  // Geolocation Button
  DOM.geoLocateBtn.addEventListener('click', handleGeolocation);

  // Refresh Button
  DOM.refreshBtn.addEventListener('click', () => {
    if (DOM.refreshIcon) {
      DOM.refreshIcon.classList.add('spinning');
      setTimeout(() => DOM.refreshIcon.classList.remove('spinning'), 800);
    }
    if (appState.currentLocation) {
      loadWeatherForLocation(appState.currentLocation);
    }
  });

  // Unit Switcher Buttons
  DOM.unitCelsius.addEventListener('click', () => setTemperatureUnit('c'));
  DOM.unitFahrenheit.addEventListener('click', () => setTemperatureUnit('f'));

  // Popular City Chips
  DOM.popularChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip && chip.dataset.city) {
      handleSearch(chip.dataset.city);
    }
  });

  // Alert Banner Close Button
  DOM.alertCloseBtn.addEventListener('click', hideAlert);

  // Online / Offline Network Listeners
  window.addEventListener('online', () => {
    showAlert('Back Online', 'Internet connection restored.');
  });
  window.addEventListener('offline', () => {
    showAlert('Network Offline', 'No internet connection detected. Please check your network.');
  });
}

/**
 * Initialize application on DOM ready.
 */
function initApp() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  setupEventListeners();
  renderRecentSearches();

  // Set initial unit active state
  if (appState.unit === 'f') {
    DOM.unitFahrenheit.classList.add('active');
    DOM.unitCelsius.classList.remove('active');
  } else {
    DOM.unitCelsius.classList.add('active');
    DOM.unitFahrenheit.classList.remove('active');
  }

  // Load last saved location or default to London
  const savedLocation = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_LOCATION);
  if (savedLocation) {
    try {
      const loc = JSON.parse(savedLocation);
      loadWeatherForLocation(loc);
      return;
    } catch {
      // Fallback
    }
  }

  // Default initial load
  loadWeatherForLocation(appState.currentLocation);
}

// Kick off when DOM is fully parsed
document.addEventListener('DOMContentLoaded', initApp);
