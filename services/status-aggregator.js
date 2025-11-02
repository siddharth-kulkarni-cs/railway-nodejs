// Status mapping for consistent API responses
// Maps StatusPage.io status indicators to normalized status values
const STATUS_MAPPING = {
  // StatusPage.io page-level indicators
  none: 'operational',
  minor: 'degraded_performance',
  major: 'partial_outage',
  critical: 'major_outage',

  // Component status values (direct mapping)
  operational: 'operational',
  degraded_performance: 'degraded_performance',
  partial_outage: 'partial_outage',
  major_outage: 'major_outage',
  under_maintenance: 'under_maintenance',

  // Additional status values that may appear
  'operational*': 'operational', // Some status pages use asterisks
  degraded: 'degraded_performance',
  performance_degraded: 'degraded_performance'
};

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000;

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Normalize status value using STATUS_MAPPING
 */
function normalizeStatus(status) {
  if (!status) return 'error';
  const normalized = STATUS_MAPPING[status.toLowerCase()];
  return normalized || status.toLowerCase();
}

/**
 * Get the most recent timestamp from multiple sources
 */
function getMostRecentTimestamp(data) {
  const timestamps = [];
  const now = new Date();

  // Page timestamp
  if (data.page?.updated_at) {
    const pageDate = new Date(data.page.updated_at);
    if (!isNaN(pageDate.getTime())) {
      timestamps.push(pageDate);
    }
  }

  // Status timestamp
  if (data.status?.updated_at) {
    const statusDate = new Date(data.status.updated_at);
    if (!isNaN(statusDate.getTime())) {
      timestamps.push(statusDate);
    }
  }

  // Component timestamps
  if (data.components && Array.isArray(data.components)) {
    data.components.forEach(component => {
      if (component.updated_at) {
        const compDate = new Date(component.updated_at);
        if (!isNaN(compDate.getTime())) {
          timestamps.push(compDate);
        }
      }
    });
  }

  // Incident timestamps
  if (data.incidents && Array.isArray(data.incidents)) {
    data.incidents.forEach(incident => {
      if (incident.updated_at) {
        const incDate = new Date(incident.updated_at);
        if (!isNaN(incDate.getTime())) {
          timestamps.push(incDate);
        }
      }
    });
  }

  // Return the most recent timestamp, or current time if none found
  if (timestamps.length === 0) {
    return now;
  }

  const mostRecent = new Date(Math.max(...timestamps.map(d => d.getTime())));
  
  // If the most recent timestamp is suspiciously old (> 7 days), use current time
  // This handles cases where APIs stop updating timestamps
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  if (now - mostRecent > maxAge) {
    return now;
  }

  return mostRecent;
}

// Base class for status page services
class StatusPageService {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async fetchStatus() {
    const now = Date.now();

    // Return cached data if still fresh
    if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.cache;
    }

    try {
      const url = `${this.baseUrl}/api/v2/summary.json`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'ContentstackDictionary/1.0',
          'Accept': 'application/json'
        }
      }, FETCH_TIMEOUT);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from status page API');
      }

      this.cache = this.normalizeData(data);
      this.cacheTimestamp = now;

      return this.cache;
    } catch (error) {
      console.error(`Error fetching ${this.name} status:`, error.message);
      // Return error state instead of throwing
      return {
        service: this.name,
        overall_status: 'error',
        description: `Unable to fetch status: ${error.message}`,
        updated_at: new Date().toISOString(),
        components: [],
        incidents: [],
        maintenance: [],
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Get the most recent timestamp from all sources
    const updatedAt = getMostRecentTimestamp(data);

    // Determine overall status from page status indicator
    const pageIndicator = data.status?.indicator;
    const overallStatus = normalizeStatus(pageIndicator || 'unknown');

    // Get status description
    const description = data.status?.description || 
                       (pageIndicator === 'none' ? 'All Systems Operational' : 'Status unavailable');

    const normalized = {
      service: this.name,
      overall_status: overallStatus,
      description: description,
      updated_at: updatedAt.toISOString(),
      components: [],
      incidents: [],
      maintenance: []
    };

    // Normalize components
    if (data.components && Array.isArray(data.components)) {
      normalized.components = data.components
        .filter(component => component && component.id && component.name)
        .map(component => ({
          id: component.id,
          name: component.name,
          status: normalizeStatus(component.status),
          description: component.description || null,
          updated_at: component.updated_at || null
        }));
    }

    // Normalize incidents (only unresolved or recently resolved)
    if (data.incidents && Array.isArray(data.incidents)) {
      normalized.incidents = data.incidents
        .filter(incident => incident && incident.id)
        .map(incident => ({
          id: incident.id,
          name: incident.name || 'Unnamed Incident',
          status: incident.status || 'unknown',
          impact: normalizeStatus(incident.impact || 'none'),
          created_at: incident.created_at || null,
          updated_at: incident.updated_at || null,
          resolved_at: incident.resolved_at || null,
          shortlink: incident.shortlink || null,
          affected_components: (incident.components || []).map(c => c.name || c.id || 'Unknown').filter(Boolean)
        }));
    }

    // Normalize scheduled maintenance
    if (data.scheduled_maintenances && Array.isArray(data.scheduled_maintenances)) {
      normalized.maintenance = data.scheduled_maintenances
        .filter(maintenance => maintenance && maintenance.id)
        .map(maintenance => ({
          id: maintenance.id,
          name: maintenance.name || 'Scheduled Maintenance',
          status: maintenance.status || 'scheduled',
          impact: normalizeStatus(maintenance.impact || 'none'),
          scheduled_for: maintenance.scheduled_for || null,
          scheduled_until: maintenance.scheduled_until || null,
          affected_components: (maintenance.components || []).map(c => c.name || c.id || 'Unknown').filter(Boolean)
        }));
    }

    return normalized;
  }
}

// OpenAI Status Service
class OpenAIStatusService extends StatusPageService {
  constructor() {
    super('OpenAI', 'https://status.openai.com');
  }
}

// Anthropic Status Service
class AnthropicStatusService extends StatusPageService {
  constructor() {
    super('Anthropic', 'https://status.anthropic.com');
  }
}

// Cloudflare Status Service
class CloudflareStatusService extends StatusPageService {
  constructor() {
    super('Cloudflare', 'https://www.cloudflarestatus.com');
  }
}

// Main Status Aggregator
class StatusAggregator {
  constructor() {
    this.services = [
      new OpenAIStatusService(),
      new AnthropicStatusService(),
      new CloudflareStatusService()
    ];

    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Categorize service status for summary statistics
   */
  categorizeStatus(status) {
    if (!status || typeof status !== 'string') {
      return 'error';
    }

    const normalized = status.toLowerCase();

    if (normalized === 'operational') {
      return 'operational';
    } else if (normalized === 'degraded_performance') {
      return 'degraded';
    } else if (normalized === 'partial_outage' || normalized === 'major_outage') {
      return 'outages';
    } else if (normalized === 'under_maintenance') {
      return 'maintenance';
    } else {
      return 'errors';
    }
  }

  /**
   * Calculate summary statistics from service statuses
   */
  calculateSummary(services) {
    const summary = {
      total_services: Object.keys(services).length,
      operational: 0,
      degraded: 0,
      outages: 0,
      maintenance: 0,
      errors: 0
    };

    Object.values(services).forEach(service => {
      const category = this.categorizeStatus(service.overall_status);
      if (summary.hasOwnProperty(category)) {
        summary[category]++;
      } else {
        summary.errors++;
      }
    });

    return summary;
  }

  async getAggregatedStatus() {
    const now = Date.now();

    // Return cached data if still fresh
    if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheDuration) {
      return this.cache;
    }

    const results = {
      timestamp: new Date().toISOString(),
      services: {},
      summary: {
        total_services: 0,
        operational: 0,
        degraded: 0,
        outages: 0,
        maintenance: 0,
        errors: 0
      }
    };

    // Fetch status from all services in parallel
    // Note: fetchStatus() now returns error state instead of throwing
    const statusPromises = this.services.map(async (service) => {
      const status = await service.fetchStatus();
      return { service, status };
    });

    const statusResults = await Promise.all(statusPromises);

    // Process results and build services object
    statusResults.forEach(({ service, status }) => {
      const serviceKey = service.name.toLowerCase();
      results.services[serviceKey] = status;
    });

    // Calculate summary from actual service statuses
    results.summary = this.calculateSummary(results.services);

    // Cache the results
    this.cache = results;
    this.cacheTimestamp = now;

    return results;
  }

  /**
   * Get status for a specific service
   * @param {string} serviceName - Name of the service (case-insensitive)
   * @returns {Promise<Object>} Service status object
   */
  async getServiceStatus(serviceName) {
    if (!serviceName || typeof serviceName !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }

    const service = this.services.find(s =>
      s.name.toLowerCase() === serviceName.toLowerCase().trim()
    );

    if (!service) {
      const availableServices = this.services.map(s => s.name).join(', ');
      throw new Error(
        `Service '${serviceName}' not found. Available services: ${availableServices}`
      );
    }

    return await service.fetchStatus();
  }

  /**
   * Clear cache (useful for manual refresh)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.services.forEach(service => {
      service.cache = null;
      service.cacheTimestamp = null;
    });
  }

  /**
   * Get list of available service names
   */
  getAvailableServices() {
    return this.services.map(s => s.name);
  }
}

module.exports = {
  StatusAggregator,
  OpenAIStatusService,
  AnthropicStatusService,
  CloudflareStatusService,
  STATUS_MAPPING
};
