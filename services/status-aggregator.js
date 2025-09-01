const crypto = require('crypto');

// Status mapping for consistent API responses
const STATUS_MAPPING = {
  // StatusPage.io indicators
  none: 'operational',
  minor: 'degraded_performance',
  major: 'partial_outage',
  critical: 'major_outage',

  // Component statuses
  operational: 'operational',
  degraded_performance: 'degraded_performance',
  partial_outage: 'partial_outage',
  major_outage: 'major_outage',
  under_maintenance: 'under_maintenance'
};

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
      const response = await fetch(`${this.baseUrl}/api/v2/summary.json`, {
        headers: {
          'User-Agent': 'ContentstackDictionary/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache = this.normalizeData(data);
      this.cacheTimestamp = now;

      return this.cache;
    } catch (error) {
      console.error(`Error fetching ${this.name} status:`, error);
      throw error;
    }
  }

  normalizeData(data) {
    const normalized = {
      service: this.name,
      overall_status: STATUS_MAPPING[data.status?.indicator] || 'unknown',
      description: data.status?.description || 'Status unavailable',
      updated_at: data.page?.updated_at || new Date().toISOString(),
      components: [],
      incidents: [],
      maintenance: []
    };

    // Normalize components
    if (data.components) {
      normalized.components = data.components.map(component => ({
        id: component.id,
        name: component.name,
        status: STATUS_MAPPING[component.status] || component.status,
        description: component.description || null,
        updated_at: component.updated_at
      }));
    }

    // Normalize incidents
    if (data.incidents) {
      normalized.incidents = data.incidents.map(incident => ({
        id: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
        resolved_at: incident.resolved_at,
        shortlink: incident.shortlink,
        affected_components: incident.components?.map(c => c.name) || []
      }));
    }

    // Normalize scheduled maintenance
    if (data.scheduled_maintenances) {
      normalized.maintenance = data.scheduled_maintenances.map(maintenance => ({
        id: maintenance.id,
        name: maintenance.name,
        status: maintenance.status,
        impact: maintenance.impact,
        scheduled_for: maintenance.scheduled_for,
        scheduled_until: maintenance.scheduled_until,
        affected_components: maintenance.components?.map(c => c.name) || []
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
        total_services: this.services.length,
        operational: 0,
        degraded: 0,
        outages: 0,
        maintenance: 0,
        errors: 0
      }
    };

    // Fetch status from all services in parallel
    const promises = this.services.map(async (service) => {
      try {
        const status = await service.fetchStatus();
        results.services[service.name.toLowerCase()] = status;

        // Update summary counters
        const overallStatus = status.overall_status;
        if (overallStatus === 'operational') {
          results.summary.operational++;
        } else if (overallStatus === 'degraded_performance') {
          results.summary.degraded++;
        } else if (overallStatus.includes('outage')) {
          results.summary.outages++;
        } else if (overallStatus === 'under_maintenance') {
          results.summary.maintenance++;
        }

        return { service: service.name, status: 'success', data: status };
      } catch (error) {
        console.error(`Failed to fetch ${service.name} status:`, error);
        results.services[service.name.toLowerCase()] = {
          service: service.name,
          overall_status: 'error',
          description: 'Unable to fetch status',
          updated_at: new Date().toISOString(),
          components: [],
          incidents: [],
          maintenance: [],
          error: error.message
        };
        results.summary.errors++;
        return { service: service.name, status: 'error', error: error.message };
      }
    });

    await Promise.all(promises);

    // Cache the results
    this.cache = results;
    this.cacheTimestamp = now;

    return results;
  }

  // Get status for a specific service
  async getServiceStatus(serviceName) {
    const service = this.services.find(s =>
      s.name.toLowerCase() === serviceName.toLowerCase()
    );

    if (!service) {
      throw new Error(`Service '${serviceName}' not found. Available services: ${this.services.map(s => s.name).join(', ')}`);
    }

    return await service.fetchStatus();
  }

  // Clear cache (useful for manual refresh)
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.services.forEach(service => {
      service.cache = null;
      service.cacheTimestamp = null;
    });
  }
}

module.exports = {
  StatusAggregator,
  OpenAIStatusService,
  AnthropicStatusService,
  CloudflareStatusService,
  STATUS_MAPPING
};
