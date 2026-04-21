import { test, expect } from '@playwright/test';

test.describe('Authentication API Tests', () => {

  test('Successful Login - API', async ({ request }) => {
    // 1. Send POST request to /api/auth/login with valid credentials
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'valid.user@example.com',
        password: 'ValidPass123!'
      }
    });

    // EXPECT: API responds with 200 OK.
    expect(response.status()).toBe(200);

    // Parse the response body to verify content
    const responseBody = await response.json();

    // Final Expected Outcome: API returns a valid authentication token and user details.
    expect(responseBody).toHaveProperty('token');
    expect(typeof responseBody.token).toBe('string');
    expect(responseBody).toHaveProperty('expiresIn');
    expect(typeof responseBody.expiresIn).toBe('number');
    expect(responseBody).toHaveProperty('userId');
    expect(typeof responseBody.userId).toBe('string');
  });

});
