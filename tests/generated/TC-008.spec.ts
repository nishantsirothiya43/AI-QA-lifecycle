import { test, expect } from '@playwright/test';

test.describe('Locked Account - API', () => {
  test('Verify API response for a locked account', async ({ request }) => {
    // Define the API endpoint and request body
    const apiResponse = await request.post('/api/auth/login', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        username: 'locked.user@example.com',
        password: 'AnyPass123!',
      },
    });

    // Expect the API to respond with 403 Forbidden
    expect(apiResponse.status()).toBe(403);

    // Parse the JSON response body
    const responseBody = await apiResponse.json();

    // Expect the response to contain a 'message' field
    expect(responseBody).toHaveProperty('message');

    // Optionally, check for a specific message indicating the account is locked
    // The exact message might vary, so adjust if needed or remove this specific check
    // expect(responseBody.message).toBe('Account is locked');
  });
});
