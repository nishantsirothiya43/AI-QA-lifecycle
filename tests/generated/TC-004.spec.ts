import { test, expect } from '@playwright/test';

test.describe('Authentication API Tests', () => {
  test('Invalid Credentials - API', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'valid.user@example.com',
        password: 'WrongPass!',
      },
    });

    expect(response.status()).toBe(401);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('errorCode');
    expect(responseBody).toHaveProperty('message');
  });
});
