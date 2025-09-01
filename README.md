# Contentstack Dictionary - Railway Node.js App


## Features

- Express.js server
- TypeScript and TSX support
- Hot reloading in development
- Type safety and IntelliSense
- **Status Page Aggregation API** - Aggregates health status from OpenAI, Anthropic, and Cloudflare
- Comprehensive user profiling and analytics tracking

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server with hot reloading:

```bash
npm run dev
```

### Production

Build the TypeScript files:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

## TypeScript Usage

This project is configured to support TypeScript (`.ts`) and TSX (`.tsx`) files.

### File Extensions

- `.ts` - Regular TypeScript files
- `.tsx` - TypeScript files with JSX syntax
- `.d.ts` - TypeScript declaration files

### Example Usage

1. **Create a TypeScript file:**

```typescript
// services/myService.ts
export class MyService {
  async getData(): Promise<string[]> {
    return ['data1', 'data2'];
  }
}
```

2. **Create a TSX file (for templating):**

```tsx
// components/emailTemplate.tsx
interface EmailProps {
  name: string;
  message: string;
}

export const createEmailTemplate = ({ name, message }: EmailProps) => (
  <html>
    <body>
      <h1>Hello {name}</h1>
      <p>{message}</p>
    </body>
  </html>
);
```

Note: TSX in Node.js is primarily useful for templating or if you're using a JSX transformer.

3. **Use TypeScript in routes:**

```typescript
// routes/api.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/data', async (req: Request, res: Response) => {
  res.json({ message: 'TypeScript works!' });
});

export default router;
```

### Commands

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Compile TypeScript to JavaScript
- `npm run type-check` - Check TypeScript types without building
- `npm start` - Run the application

### TypeScript Configuration

The `tsconfig.json` file is configured for Node.js development with:
- ES2022 target
- Node module resolution
- Strict type checking
- JSX support (preserved)
- Source maps for debugging

### Tips

1. **VS Code Integration**: Install the TypeScript extension for the best development experience
2. **Type Definitions**: Most popular npm packages have type definitions available via `@types/*`
3. **Gradual Migration**: You can mix JavaScript and TypeScript files in the same project
4. **Express Types**: Use `@types/express` for Express.js type definitions (already installed)

## Project Structure

```
├── app.js              # Main application file
├── routes/             # Express routes
│   ├── index.js
│   └── example.ts     # Example TypeScript route
├── services/          # Business logic
│   ├── example.service.ts
│   └── status-aggregator.js # Status page aggregation service
├── views/             # HTML views
│   ├── index.html
│   ├── status-dashboard.html # Beautiful status dashboard
│   └── [other HTML files]
├── types/             # TypeScript type definitions
│   └── index.ts
├── public/            # Static files
├── tests/             # Test files
└── tsconfig.json      # TypeScript configuration
```

## Status Dashboard

Visit `/status` to see a beautiful, real-time dashboard displaying the status of all monitored services. The dashboard features:

- **Live Status Cards**: Visual representation of each service's current status
- **Summary Statistics**: Overview of operational, degraded, and outage counts
- **Component Details**: Individual component status within each service
- **Auto-refresh**: Automatically updates every 5 minutes
- **Manual Refresh**: Click the refresh button for immediate updates
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Modern UI**: Clean, professional design with smooth animations

### Example Screenshot
```
┌─────────────────────────────────────────────────────────────┐
│                 Service Status Dashboard                    │
├─────────────────────────────────────────────────────────────┤
│  Operational: 2    Degraded: 1    Outages: 0    Errors: 0  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  OpenAI                     🟢 Operational          │    │
│  │  Updated: 2m ago                                   │    │
│  │  Components:                                       │    │
│  │  • Chat - Operational                              │    │
│  │  • API - Operational                               │    │
│  │  • ...                                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Anthropic                  🟡 Degraded             │    │
│  │  Updated: 1m ago                                   │    │
│  │  Components:                                       │    │
│  │  • Claude API - Degraded                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Status Aggregation API

This application provides real-time status aggregation from major AI and cloud service providers.

#### GET `/api/status/aggregate`
Aggregates status from all configured services (OpenAI, Anthropic, Cloudflare).

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "openai": {
      "service": "OpenAI",
      "overall_status": "operational",
      "description": "All Systems Operational",
      "updated_at": "2024-01-01T12:00:00.000Z",
      "components": [
        {
          "id": "01JMXBRMFEMZK0HPK19RYET250",
          "name": "Fine-tuning",
          "status": "operational",
          "updated_at": "2024-01-01T12:00:00.000Z"
        }
      ],
      "incidents": [],
      "maintenance": []
    }
  },
  "summary": {
    "total_services": 3,
    "operational": 2,
    "degraded": 1,
    "outages": 0,
    "maintenance": 0,
    "errors": 0
  }
}
```

#### GET `/api/status/:service`
Get status for a specific service. Supported services: `openai`, `anthropic`, `cloudflare`.

**Parameters:**
- `service` (path): Service name (openai, anthropic, cloudflare)
- `refresh` (query, optional): Set to `true` to bypass cache

**Example:** `GET /api/status/openai`

**Response:** Same format as individual service in aggregate endpoint.

#### GET `/api/status/health`
Health check endpoint for the status aggregation service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": ["openai", "anthropic", "cloudflare"],
  "cache": {
    "enabled": true,
    "duration_minutes": 5
  }
}
```

### Status Values
- `operational` - Service is working normally
- `degraded_performance` - Service is experiencing performance issues
- `partial_outage` - Some components are down
- `major_outage` - Service is completely down
- `under_maintenance` - Service is undergoing scheduled maintenance

### Features
- **Caching**: 5-minute cache to reduce API load and improve performance
- **Error Handling**: Graceful degradation when individual services are unreachable
- **Analytics**: Comprehensive tracking of API usage and performance
- **Rate Limiting**: Built-in protection against excessive requests
- **Real-time Data**: Fetches latest status from official status pages

## License

ISC