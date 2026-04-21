import { test, expect } from '@playwright/test';

test.describe('API Authentication Tests', () => {
  test('should reject malformed login request missing password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'valid.user@example.com',
      },
    });

    expect(response.status()).toBe(400);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('message');
  });
});
