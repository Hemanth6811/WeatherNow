/**
 * Nimbus Weather App — script.js
 * ─────────────────────────────────────────────────────────────────
 * SETUP INSTRUCTIONS:
 *  1. Sign up at https://openweathermap.org/api
 *  2. Copy your free API key
 *  3. Replace 'YOUR_API_KEY_HERE' below with your actual key
 *  4. Open index.html in a browser (or serve via a local server)
 * ─────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════
// 🔑  CONFIGURATION — Set your API key here
// ════════════════════════════════════════════════
const API_KEY = '105e9a41f858f59ded7f4151ae4f96a4';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Max number of recent searches to keep in history
const MAX_HISTORY = 6;

// ════════════════════════════════════════════════
// 📌  DOM References
// ════════════════════════════════════════════════
const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const locationBtn   = document.getElementById('locationBtn');
const themeToggle   = document.getElementById('themeToggle');
const themeIcon     = document.getElementById('themeIcon');
const loader        = document.getElementById('loader');
const errorCard     = document.getElementById('errorCard');
const errorMsg      = document.getElementById('errorMsg');
const weatherMain   = document.getElementById('weatherMain');
const welcomeState  = document.getElementById('welcomeState');
const historyRow    = document.getElementById('historyRow');

// Current weather DOM nodes
const cityName          = document.getElementById('cityName');
const countryDate       = document.getElementById('countryDate');
const weatherIconLarge  = document.getElementById('weatherIconLarge');
const temperature       = document.getElementById('temperature');
const weatherDescription= document.getElementById('weatherDescription');
const feelsLike         = document.getElementById('feelsLike');
const humidity          = document.getElementById('humidity');
const windSpeed         = document.getElementById('windSpeed');
const visibility        = document.getElementById('visibility');
const pressure          = document.getElementById('pressure');
const forecastGrid      = document.getElementById('forecastGrid');

// ════════════════════════════════════════════════
// 🌡  Weather condition → Emoji icon mapping
// ════════════════════════════════════════════════
/**
 * Maps OpenWeatherMap condition codes to expressive emoji.
 * OWM groups: 2xx Thunderstorm, 3xx Drizzle, 5xx Rain,
 *             6xx Snow, 7xx Atmosphere, 800 Clear, 80x Clouds
 */
function getWeatherEmoji(conditionCode, isNight = false) {
  if (conditionCode >= 200 && conditionCode < 300) return '⛈';
  if (conditionCode >= 300 && conditionCode < 400) return '🌦';
  if (conditionCode >= 500 && conditionCode < 600) {
    if (conditionCode === 511) return '🌨';   // freezing rain
    if (conditionCode >= 502) return '🌧';   // heavy rain
    return '🌦';
  }
  if (conditionCode >= 600 && conditionCode < 700) return '❄️';
  if (conditionCode === 701 || conditionCode === 741) return '🌫';
  if (conditionCode >= 700 && conditionCode < 800) return '🌪';
  if (conditionCode === 800) return isNight ? '🌙' : '☀️';
  if (conditionCode === 801) return isNight ? '🌤' : '🌤';
  if (conditionCode === 802) return '⛅';
  if (conditionCode >= 803) return '☁️';
  return '🌡';
}

// ════════════════════════════════════════════════
// 🗓  Date formatting helpers
// ════════════════════════════════════════════════
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Returns a pretty date string for the current-weather header.
 * Example: "Wednesday, 4 June 2025"
 */
function formatCurrentDate() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${days[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Checks if a Unix timestamp (UTC) represents nighttime at the given UTC offset.
 */
function isNighttime(dt, timezoneOffset) {
  const localDate = new Date((dt + timezoneOffset) * 1000);
  const hour = localDate.getUTCHours();
  return hour < 6 || hour >= 20;
}

// ════════════════════════════════════════════════
// 🔄  UI State helpers
// ════════════════════════════════════════════════

/** Show or hide the loading spinner. */
function setLoading(show) {
  loader.hidden        = !show;
  weatherMain.hidden   = show || true;  // hide weather while loading
  errorCard.hidden     = true;
  welcomeState.hidden  = true;
  if (!show) loader.hidden = true;
}

/** Show an error message to the user. */
function showError(message) {
  errorCard.hidden   = false;
  errorMsg.textContent = message;
  loader.hidden      = true;
  weatherMain.hidden = true;
  welcomeState.hidden = true;
}

/** Reset all states to show the welcome screen. */
function showWelcome() {
  welcomeState.hidden = false;
  weatherMain.hidden  = true;
  errorCard.hidden    = true;
  loader.hidden       = true;
}

// ════════════════════════════════════════════════
// 🌐  API Calls
// ════════════════════════════════════════════════

/**
 * Fetches current weather data for a given city name or lat/lon.
 * @param {string} query - City name (e.g. "London") or coords object {lat, lon}
 */
async function fetchCurrentWeather(query) {
  const params = typeof query === 'string'
    ? `q=${encodeURIComponent(query)}`
    : `lat=${query.lat}&lon=${query.lon}`;
  const url = `${BASE_URL}/weather?${params}&units=metric&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) throw new Error('City not found. Please check the spelling and try again.');
    if (response.status === 401) throw new Error('Invalid API key. Please add your OpenWeatherMap API key in script.js.');
    throw new Error(`Weather API error (${response.status}). Please try again.`);
  }
  return response.json();
}

/**
 * Fetches 5-day / 3-hour forecast data.
 * @param {number} lat
 * @param {number} lon
 */
async function fetchForecast(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch forecast data.');
  return response.json();
}

// ════════════════════════════════════════════════
// 🖼  Rendering
// ════════════════════════════════════════════════

/**
 * Populates the main current-weather card with API data.
 * @param {Object} data - OpenWeatherMap /weather response
 */
function renderCurrentWeather(data) {
  const { name, sys, weather, main, wind, visibility: vis, timezone, dt } = data;
  const condition = weather[0];
  const night = isNighttime(dt, timezone);

  // Location & date
  cityName.textContent    = name;
  countryDate.textContent = `${sys.country} · ${formatCurrentDate()}`;

  // Icon & temperature
  weatherIconLarge.textContent = getWeatherEmoji(condition.id, night);
  temperature.textContent      = Math.round(main.temp);
  weatherDescription.textContent = condition.description;
  feelsLike.textContent        = `Feels like ${Math.round(main.feels_like)}°C`;

  // Stats
  humidity.textContent  = `${main.humidity}%`;
  windSpeed.textContent = `${Math.round(wind.speed * 3.6)} km/h`; // m/s → km/h
  visibility.textContent= `${(vis / 1000).toFixed(1)} km`;
  pressure.textContent  = `${main.pressure} hPa`;
}

/**
 * Processes the forecast list (given in 3-hour intervals) into one entry
 * per day (using the midday reading), then renders the 5-day forecast grid.
 * @param {Object} data - OpenWeatherMap /forecast response
 */
function renderForecast(data) {
  // Group by day — pick the reading closest to 12:00 local time
  const dailyMap = {};
  data.list.forEach(entry => {
    const date = new Date(entry.dt * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = date.getUTCHours();

    // Prefer readings near 12:00 UTC; fall back to first available
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = entry;
    } else if (Math.abs(hour - 12) < Math.abs(new Date(dailyMap[dayKey].dt * 1000).getUTCHours() - 12)) {
      dailyMap[dayKey] = entry;
    }
  });

  // Take the next 5 days (skip today if we already have current weather)
  const days = Object.entries(dailyMap).slice(0, 5);

  forecastGrid.innerHTML = days.map(([dayStr, entry], index) => {
    const date        = new Date(entry.dt * 1000);
    const dayLabel    = index === 0 ? 'Today' : DAY_NAMES[date.getUTCDay()];
    const icon        = getWeatherEmoji(entry.weather[0].id);
    const high        = Math.round(entry.main.temp_max);
    const low         = Math.round(entry.main.temp_min);

    return `
      <div class="forecast-card" style="animation-delay: ${index * 0.07}s" role="listitem" aria-label="${dayLabel}: high ${high}°, low ${low}°">
        <span class="forecast-day">${dayLabel}</span>
        <span class="forecast-icon" aria-hidden="true">${icon}</span>
        <span class="forecast-temp-high">${high}°</span>
        <span class="forecast-temp-low">${low}°</span>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════
// 🔍  Main search / weather-load orchestrator
// ════════════════════════════════════════════════

/**
 * Orchestrates fetching + rendering weather for a city name.
 * Also updates search history.
 * @param {string} city
 */
async function loadWeatherByCity(city) {
  if (!city.trim()) return;
  setLoading(true);

  try {
    // Step 1: Fetch current weather (also gives us lat/lon for forecast)
    const currentData = await fetchCurrentWeather(city);

    // Step 2: Fetch 5-day forecast using the lat/lon from step 1
    const { lat, lon } = currentData.coord;
    const forecastData = await fetchForecast(lat, lon);

    // Step 3: Render
    renderCurrentWeather(currentData);
    renderForecast(forecastData);

    // Step 4: Show weather section
    loader.hidden      = true;
    weatherMain.hidden = false;
    errorCard.hidden   = true;
    welcomeState.hidden= true;

    // Step 5: Save to search history
    addToHistory(currentData.name);

  } catch (err) {
    showError(err.message);
  }
}

/**
 * Loads weather for given GPS coordinates (from geolocation API).
 */
async function loadWeatherByCoords(lat, lon) {
  setLoading(true);
  try {
    const currentData  = await fetchCurrentWeather({ lat, lon });
    const forecastData = await fetchForecast(lat, lon);

    renderCurrentWeather(currentData);
    renderForecast(forecastData);

    loader.hidden       = true;
    weatherMain.hidden  = false;
    errorCard.hidden    = true;
    welcomeState.hidden = true;

    addToHistory(currentData.name);
  } catch (err) {
    showError(err.message);
  }
}

// ════════════════════════════════════════════════
// 📍  Geolocation
// ════════════════════════════════════════════════

/**
 * Requests the browser for the user's GPS position,
 * then loads weather for those coordinates.
 */
function requestGeolocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }

  setLoading(true);

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude: lat, longitude: lon } = position.coords;
      loadWeatherByCoords(lat, lon);
    },
    error => {
      let msg = 'Unable to retrieve your location.';
      if (error.code === error.PERMISSION_DENIED) msg = 'Location access denied. Please allow location or search manually.';
      showError(msg);
    }
  );
}

// ════════════════════════════════════════════════
// 🕘  Search History (localStorage)
// ════════════════════════════════════════════════

/** Returns the current search history array from localStorage. */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('nimbusHistory') || '[]');
  } catch { return []; }
}

/** Saves the history array to localStorage. */
function saveHistory(arr) {
  localStorage.setItem('nimbusHistory', JSON.stringify(arr));
}

/**
 * Adds a city to the top of the search history (deduplicates + enforces max).
 * Then re-renders the history chip row.
 */
function addToHistory(city) {
  let history = getHistory();
  // Remove duplicates (case-insensitive)
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  history = history.slice(0, MAX_HISTORY);
  saveHistory(history);
  renderHistory();
}

/** Removes a specific city from history. */
function removeFromHistory(city) {
  let history = getHistory().filter(c => c !== city);
  saveHistory(history);
  renderHistory();
}

/** Renders the history chip row from localStorage. */
function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyRow.innerHTML = '';
    return;
  }

  historyRow.innerHTML = history.map(city => `
    <span class="history-chip" role="button" tabindex="0" aria-label="Search ${city}" data-city="${city}">
      ${city}
      <span class="chip-remove" data-remove="${city}" title="Remove" aria-label="Remove ${city}">✕</span>
    </span>
  `).join('');
}

/** Handles clicks within the history-row (event delegation). */
historyRow.addEventListener('click', e => {
  const chip   = e.target.closest('.history-chip');
  const remove = e.target.closest('.chip-remove');

  if (remove) {
    // Stop click from also triggering chip search
    e.stopPropagation();
    removeFromHistory(remove.dataset.remove);
    return;
  }

  if (chip) {
    const city = chip.dataset.city;
    searchInput.value = city;
    loadWeatherByCity(city);
  }
});

/** Allow keyboard activation of history chips. */
historyRow.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const chip = e.target.closest('.history-chip');
    if (chip) {
      searchInput.value = chip.dataset.city;
      loadWeatherByCity(chip.dataset.city);
    }
  }
});

// ════════════════════════════════════════════════
// 🌓  Dark / Light Theme Toggle
// ════════════════════════════════════════════════

/**
 * Reads stored theme preference or falls back to dark.
 */
function initTheme() {
  const saved = localStorage.getItem('nimbusTheme') || 'dark';
  applyTheme(saved);
}

/** Applies a theme ('dark' | 'light') to the <html> element and updates the toggle icon. */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
  localStorage.setItem('nimbusTheme', theme);
}

/** Toggles between dark and light themes. */
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ════════════════════════════════════════════════
// ⌨️  Event Listeners — Search
// ════════════════════════════════════════════════

/** Search button click. */
searchBtn.addEventListener('click', () => {
  loadWeatherByCity(searchInput.value);
});

/** Enter key in search input. */
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') loadWeatherByCity(searchInput.value);
});

/** Clear error on new input. */
searchInput.addEventListener('input', () => {
  if (errorCard.hidden === false) {
    errorCard.hidden = true;
    showWelcome();
  }
});

/** Location button. */
locationBtn.addEventListener('click', requestGeolocation);

// ════════════════════════════════════════════════
// 🚀  Initialization
// ════════════════════════════════════════════════

/**
 * Runs on page load:
 *  1. Apply saved theme
 *  2. Render search history chips
 *  3. Show the welcome state
 *  4. Optionally auto-load last searched city
 */
function init() {
  initTheme();
  renderHistory();

  // Auto-load the most recently searched city (if any)
  const history = getHistory();
  if (history.length > 0) {
    // Uncomment the line below to auto-load weather on page open:
    // loadWeatherByCity(history[0]);
  }

  showWelcome();
}

// Kick off the app
init();