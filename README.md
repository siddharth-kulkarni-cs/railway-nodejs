# Contentstack Dictionary - Railway Node.js App


## Features

- Express.js server
- TypeScript and TSX support
- Hot reloading in development
- Type safety and IntelliSense

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
│   └── example.service.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── views/             # HTML views
├── public/            # Static files
├── tests/             # Test files
└── tsconfig.json      # TypeScript configuration
```

## License

ISC