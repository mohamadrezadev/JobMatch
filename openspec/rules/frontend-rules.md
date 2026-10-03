# OpenSpec Rules for JobMatch Frontend

## Frontend Stack Rules

### Framework
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **UI Components:** Radix UI primitives

### Directory Structure
```
src/
├── app/                    # Next.js pages (route segments)
│   ├── (auth)/            # Auth layout group
│   ├── (dashboard)/       # Protected layout group
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI primitives
│   ├── layout/           # Navbar, Sidebar, etc.
│   └── feature-specific/ # Component per feature
├── lib/                  # Utilities
│   ├── api-client.ts     # API client
│   └── utils.ts          # Shared utilities
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

### Routing Patterns
- Auth routes: `/login`, `/register` (public)
- Dashboard routes: `/dashboard/*`, `/profile`, `/jobs` (protected)
- Dynamic routes: `/jobs/[id]` (protected)

### API Client Pattern
```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Type Definitions
```typescript
// types/index.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: 'Remote' | 'On-site' | 'Hybrid';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  postedAt: string;
}

export interface MatchResult {
  matchScore: number;
  breakdown: {
    skills: { score: number; matched: Skill[]; missing: Skill[] };
    experience: { score: number; details: string };
    location: { score: number; details: string };
    salary: { score: number; details: string };
  };
  explanation: string;
  skillGaps: string[];
}
```

### State Management (Zustand)
```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: async (email, password) => {
        // Implementation
      },
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (user) => set({ user, isAuthenticated: true }),
    }),
    { name: 'auth-storage' }
  )
);
```

## Design Principles

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Use Tailwind responsive prefixes (`md:`, `lg:`, etc.)

### Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML where possible
- ARIA labels for icons and non-text elements
- Color contrast ratio >= 4.5:1

### Performance
- Use Next.js Image component for optimization
- Lazy load heavy components with `next/dynamic`
- Minimize bundle size with tree shaking
- Implement code splitting for route segments

## Testing
- Unit tests with Jest + React Testing Library
- Visual regression tests with Storybook (future)
- E2E tests with Playwright (future)

## Naming Conventions
- Components: PascalCase (`JobCard.tsx`, `UserProfile.tsx`)
- Hooks: camelCase starting with `use` (`useAuth.ts`, `useJobs.ts`)
- Pages: kebab-case matching route (`job-detail.tsx`, `user-profile.tsx`)
- Styles: Tailwind classes only (no CSS modules)