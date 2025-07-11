# ChatLease Testing Strategy

## Overview

This document outlines the testing strategy for the refactored ChatLease application to ensure reliability and maintainability.

## 1. Unit Tests

### JavaScript Utilities (app-refactored.js)

```javascript
// Test examples for utility functions

describe('ChatLease.Utils', () => {
    test('formatCurrency', () => {
        expect(ChatLease.Utils.formatCurrency(1500)).toBe('$1,500');
        expect(ChatLease.Utils.formatCurrency(0)).toBe('$0');
    });

    test('debounce', (done) => {
        let counter = 0;
        const increment = ChatLease.Utils.debounce(() => counter++, 100);
        
        increment();
        increment();
        increment();
        
        setTimeout(() => {
            expect(counter).toBe(1);
            done();
        }, 150);
    });

    test('sanitizeHTML', () => {
        const dirty = '<script>alert("xss")</script>';
        const clean = ChatLease.Utils.sanitizeHTML(dirty);
        expect(clean).not.toContain('<script>');
    });
});
```

### API Module Tests

```javascript
describe('ChatLease.API', () => {
    test('loadProperties with filters', async () => {
        const filters = { location: 'Plateau', minPrice: 1000 };
        const data = await ChatLease.API.loadProperties(filters);
        
        expect(data).toBeDefined();
        expect(Array.isArray(data.properties)).toBe(true);
    });

    test('handles API errors gracefully', async () => {
        // Mock failed request
        global.fetch = jest.fn(() => 
            Promise.resolve({ ok: false, status: 500 })
        );
        
        await expect(ChatLease.API.loadProperties())
            .rejects.toThrow('HTTP 500');
    });
});
```

## 2. Integration Tests

### Theme System

```javascript
describe('Theme Integration', () => {
    test('theme persistence', () => {
        // Set dark theme
        ChatLease.Theme.apply('dark');
        
        // Verify DOM update
        expect(document.documentElement.getAttribute('data-theme'))
            .toBe('dark');
        
        // Verify storage
        expect(localStorage.getItem('chatlease_theme'))
            .toBe('"dark"');
    });

    test('theme transition class', () => {
        ChatLease.Theme.toggle();
        
        // Should add transitioning class
        expect(document.documentElement.classList.contains('theme-transitioning'))
            .toBe(true);
        
        // Should remove after delay
        setTimeout(() => {
            expect(document.documentElement.classList.contains('theme-transitioning'))
                .toBe(false);
        }, 100);
    });
});
```

### Property Display

```javascript
describe('Property Display', () => {
    test('renders property cards correctly', () => {
        const mockProperties = [{
            id: 1,
            address: '123 Test St',
            price: 1500,
            bedrooms: 2,
            listing_type: 'rental'
        }];
        
        state.properties = mockProperties;
        ChatLease.Property.display();
        
        const container = document.getElementById('propertyResults');
        expect(container.innerHTML).toContain('123 Test St');
        expect(container.innerHTML).toContain('$1,500/mo');
    });
});
```

## 3. End-to-End Tests

### User Flows

```javascript
// Using Cypress or Playwright

describe('Property Search Flow', () => {
    it('searches for properties', () => {
        cy.visit('/');
        
        // Enter search criteria
        cy.get('#locationInput').type('Plateau');
        cy.get('#minPriceSelect').select('1000');
        cy.get('#maxPriceSelect').select('2000');
        
        // Click search
        cy.contains('Search').click();
        
        // Verify results
        cy.get('.property-card').should('have.length.greaterThan', 0);
        cy.contains('rentals found');
    });

    it('switches between rent and buy', () => {
        cy.visit('/');
        
        // Default should be rental
        cy.get('#rentTab').should('have.class', 'bg-primary');
        
        // Switch to buy
        cy.get('#buyTab').click();
        cy.get('#buyTab').should('have.class', 'bg-primary');
        cy.contains('Properties for Sale');
    });
});
```

### Chat Interaction

```javascript
describe('Chat System', () => {
    it('opens chat and sends message', () => {
        cy.visit('/');
        
        // Open chat
        cy.get('#chatBubble').click();
        cy.get('#chatbotWindow').should('be.visible');
        
        // Send message
        cy.get('#unifiedChatInput').type('What areas do you recommend?');
        cy.contains('Send').click();
        
        // Verify response
        cy.get('.chat-message').should('have.length.greaterThan', 1);
    });

    it('switches chat modes', () => {
        cy.get('#savedChatMode').click();
        cy.contains('saved properties mode');
    });
});
```

## 4. Visual Regression Tests

### Critical UI States

```javascript
// Using Percy or Chromatic

describe('Visual Tests', () => {
    it('property grid layout', () => {
        cy.visit('/');
        cy.wait(2000); // Wait for properties to load
        cy.percySnapshot('Property Grid');
    });

    it('dark mode appearance', () => {
        cy.get('#themeToggle').click();
        cy.wait(500); // Wait for transition
        cy.percySnapshot('Dark Mode');
    });

    it('mobile responsive view', () => {
        cy.viewport('iphone-x');
        cy.percySnapshot('Mobile View');
    });
});
```

## 5. Performance Tests

### Loading Performance

```javascript
describe('Performance', () => {
    it('loads properties within 2 seconds', () => {
        const startTime = performance.now();
        
        cy.visit('/');
        cy.get('.property-card').should('exist');
        
        const loadTime = performance.now() - startTime;
        expect(loadTime).to.be.lessThan(2000);
    });

    it('search debouncing works', () => {
        let apiCallCount = 0;
        
        cy.intercept('/api/properties*', () => {
            apiCallCount++;
        });
        
        // Type quickly
        cy.get('#locationInput').type('Plateau Mont Royal');
        
        // Should only make one API call
        cy.wait(500);
        expect(apiCallCount).to.equal(1);
    });
});
```

## 6. Accessibility Tests

### WCAG Compliance

```javascript
// Using axe-core

describe('Accessibility', () => {
    it('has no detectable a11y violations', () => {
        cy.visit('/');
        cy.injectAxe();
        cy.checkA11y();
    });

    it('keyboard navigation works', () => {
        cy.visit('/');
        
        // Tab through interactive elements
        cy.get('body').tab();
        cy.focused().should('have.attr', 'id', 'locationInput');
        
        // Continue tabbing
        cy.focused().tab();
        cy.focused().should('have.attr', 'id', 'minPriceSelect');
    });

    it('screen reader friendly', () => {
        // Check ARIA labels
        cy.get('#chatBubble button').should('have.attr', 'aria-label');
        cy.get('.property-card img').should('have.attr', 'alt');
    });
});
```

## 7. Cross-Browser Tests

### Browser Matrix

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

```javascript
// Using BrowserStack or Sauce Labs

const browsers = [
    { browser: 'chrome', version: 'latest' },
    { browser: 'firefox', version: 'latest' },
    { browser: 'safari', version: 'latest' }
];

browsers.forEach(({ browser, version }) => {
    describe(`${browser} ${version}`, () => {
        it('loads and functions correctly', () => {
            // Run core tests
        });
    });
});
```

## 8. Security Tests

### XSS Prevention

```javascript
describe('Security', () => {
    it('prevents XSS in chat messages', () => {
        const maliciousInput = '<script>alert("xss")</script>';
        
        cy.get('#unifiedChatInput').type(maliciousInput);
        cy.contains('Send').click();
        
        // Should be escaped
        cy.get('.chat-message').last()
            .should('contain', '&lt;script&gt;')
            .should('not.contain', '<script>');
    });

    it('validates input data', () => {
        // Try invalid price
        cy.get('#minPriceSelect').invoke('val', '-1000');
        cy.contains('Search').click();
        
        // Should handle gracefully
        cy.contains('Error').should('not.exist');
    });
});
```

## 9. Load Tests

### Concurrent Users

```javascript
// Using k6 or Artillery

import http from 'k6/http';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 }, // Ramp up
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },   // Ramp down
    ],
};

export default function() {
    // Test property search
    let response = http.get('http://localhost:3000/api/properties');
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Test chat API
    response = http.post('http://localhost:3000/api/ai/unified-chat', 
        JSON.stringify({ message: 'Hello' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(response, {
        'chat responds': (r) => r.status === 200,
    });
}
```

## 10. Monitoring & Alerts

### Key Metrics to Track

1. **Performance Metrics:**
   - Page load time
   - Time to interactive
   - API response times
   - JavaScript error rate

2. **User Metrics:**
   - Search completion rate
   - Chat engagement rate
   - Property view duration
   - Save/favorite rate

3. **System Metrics:**
   - Server CPU/Memory
   - Database query time
   - API rate limits
   - Error rates

### Alert Thresholds

```javascript
const alerts = {
    pageLoadTime: { threshold: 3000, severity: 'warning' },
    apiResponseTime: { threshold: 1000, severity: 'critical' },
    errorRate: { threshold: 0.01, severity: 'critical' },
    chatFailureRate: { threshold: 0.05, severity: 'warning' }
};
```

## Testing Schedule

1. **Pre-commit:** Unit tests (must pass)
2. **Pre-merge:** Integration + E2E tests
3. **Daily:** Full test suite + visual regression
4. **Weekly:** Performance + load tests
5. **Monthly:** Security audit + accessibility review

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## Success Criteria

- ✅ 90%+ code coverage
- ✅ All tests passing in CI
- ✅ Page load < 3 seconds
- ✅ API response < 500ms
- ✅ Zero accessibility violations
- ✅ Works on all target browsers
- ✅ Handles 100+ concurrent users