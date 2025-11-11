# MavPath Test Suite

This directory contains comprehensive unit tests for the MavPath application.

## Test Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Global test setup and configuration
├── fixtures/                    # Test data fixtures
│   └── events.ts               # Mock event data
├── mocks/                       # Mock implementations
│   ├── googleMaps.ts           # Google Maps API mocks
│   └── reactQuery.tsx          # React Query test utilities
├── lib/                         # Library/utility tests
│   ├── utils.test.ts           # Utility functions tests
│   ├── events.test.ts          # Event helper functions tests
│   └── mapState.test.ts        # Zustand store tests
├── hooks/                       # Custom hooks tests
│   └── use-events.test.ts      # useEvents hook tests
├── components/                  # Component tests
│   ├── maps/                   # Map-related components
│   │   ├── DirectionsPanel.test.tsx
│   │   ├── GeolocateButton.test.tsx
│   │   └── SearchAutocomplete.test.tsx
│   └── panels/                 # Panel components
│       └── EventsPanel.test.tsx
└── scripts/                     # Script tests
    └── scrape-uta-events.test.js
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm test -- --watch
```

### Run tests with UI

```bash
npm run test:ui
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Run specific test file

```bash
npm test -- tests/lib/utils.test.ts
```

### Run tests matching a pattern

```bash
npm test -- -t "EventsPanel"
```

## Test Statistics

**Total Tests:** 180
**Passing:** 174 (96.7%)
**Failing:** 6 (3.3%)

### Coverage by Category

- **Utilities & Helpers:** 100% (26 tests)
- **State Management:** 100% (34 tests)
- **Custom Hooks:** 100% (15 tests)
- **Scraper Utilities:** 100% (38 tests)
- **UI Components:** ~94% (61 tests)

### Test Breakdown

| Category       | File                        | Tests | Status         |
| -------------- | --------------------------- | ----- | -------------- |
| **Utilities**  | utils.test.ts               | 10    | ✅ All passing |
| **Utilities**  | events.test.ts              | 16    | ✅ All passing |
| **State**      | mapState.test.ts            | 34    | ✅ All passing |
| **Hooks**      | use-events.test.ts          | 15    | ✅ All passing |
| **Components** | EventsPanel.test.tsx        | 18    | ⚠️ 3 failing   |
| **Components** | DirectionsPanel.test.tsx    | 16    | ⚠️ 2 failing   |
| **Components** | GeolocateButton.test.tsx    | 16    | ✅ All passing |
| **Components** | SearchAutocomplete.test.tsx | 17    | ✅ All passing |
| **Scripts**    | scrape-uta-events.test.js   | 38    | ✅ All passing |

## Testing Stack

- **Test Runner:** [Vitest](https://vitest.dev/) v4.0.8
- **React Testing:** [@testing-library/react](https://testing-library.com/react) v16.3.0
- **DOM Environment:** [happy-dom](https://github.com/capricorn86/happy-dom) v20.0.10
- **User Interactions:** [@testing-library/user-event](https://testing-library.com/docs/user-event/intro) v14.6.1
- **Assertions:** [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/) v6.9.1

## Mock Utilities

### Google Maps Mock (`tests/mocks/googleMaps.ts`)

Provides mock implementations for:

- `MockLatLng` - Google Maps coordinates
- `MockMap` - Map instance
- `MockDirectionsService` - Routing service
- `MockPlacesService` - Places API
- `MockAutocomplete` - Autocomplete widget

Usage:

```typescript
import {
  setupGoogleMapsMock,
  cleanupGoogleMapsMock,
} from "../mocks/googleMaps";

beforeEach(() => {
  setupGoogleMapsMock();
});

afterEach(() => {
  cleanupGoogleMapsMock();
});
```

### React Query Wrapper (`tests/mocks/reactQuery.tsx`)

Provides test utilities for React Query:

```typescript
import { createQueryWrapper } from "../mocks/reactQuery";

const { result } = renderHook(() => useEvents(), {
  wrapper: createQueryWrapper(),
});
```

## Test Fixtures

### Event Fixtures (`tests/fixtures/events.ts`)

Provides mock event data:

```typescript
import { createMockEvent, mockEvents } from "../fixtures/events";

// Create custom mock event
const event = createMockEvent({
  title: "Custom Event",
  category: "sports",
});

// Use predefined mock events
const events = mockEvents; // Array of 4 events
```

## Known Issues

### Failing Tests (6 total)

#### EventsPanel Tests (3 failing)

1. **"should display event categories as badges"** - Badge rendering issue
2. **"should compute unique locations"** - Dropdown button text mismatch
3. **"should compute unique tags"** - Dropdown button text mismatch

#### DirectionsPanel Tests (2 failing)

1. **"should show error when clicking button without origin"** - Error message timing issue
2. **"should clear error when origin is provided"** - Error clearing logic

### Warnings

Some tests produce React `act()` warnings. These are harmless but indicate async state updates that could be better handled. They don't affect test validity.

## Writing New Tests

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Place tests in `tests/` directory mirroring `src/` structure

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("ComponentName", () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe("feature group", () => {
    it("should do something specific", () => {
      // Arrange
      const input = "test";

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

### Component Testing Pattern

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should handle user interaction", async () => {
  const user = userEvent.setup();
  render(<Component />);

  const button = screen.getByRole("button", { name: /click me/i });
  await user.click(button);

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Use descriptive test names** - "should X when Y" format
2. **Test behavior, not implementation** - Focus on user-visible outcomes
3. **Mock external dependencies** - Google Maps, fetch, etc.
4. **Use testing-library queries** - Prefer `getByRole`, `getByLabelText`
5. **Avoid testing library internals** - Don't test shadcn/ui components
6. **Clean up after tests** - Use `beforeEach`/`afterEach` hooks
7. **Keep tests focused** - One concept per test
8. **Use fixtures for data** - DRY principle for test data

## Debugging Tests

### Run single test with logs

```bash
npm test -- -t "test name" --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

### View test UI

```bash
npm run test:ui
```

Opens interactive test browser at http://localhost:51204

## Configuration

Test configuration is in `vitest.config.ts`:

- Environment: happy-dom
- Setup file: `tests/setup.ts`
- Coverage provider: v8
- Path alias: `@/` → `./src/`

## CI/CD Integration

Tests can be run in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run tests
  run: npm test -- --run --reporter=json --outputFile=test-results.json
```

## Future Improvements

- [ ] Fix remaining 6 failing tests
- [ ] Add integration tests
- [ ] Increase coverage to 95%+
- [ ] Add visual regression tests
- [ ] Add E2E tests with Playwright
- [ ] Add performance tests
- [ ] Mock MSW for API testing
- [ ] Add accessibility tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Testing Guide](https://react.dev/learn/testing)
