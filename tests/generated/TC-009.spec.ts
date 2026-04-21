import { test, expect } from '@playwright/test';

test.describe('API - Malformed request - missing username', () => {
  test('should return 400 when username is missing in the login request', async ({ request }) => {
    // Define the API endpoint for login
    const loginEndpoint = '/api/auth/login';

    // Construct the request body missing the username field
    const requestBody = {
      password: 'ValidPass123!',
    };

    // Send a POST request to the login endpoint with the malformed body
    const response = await request.post(loginEndpoint, {
      data: requestBody,
    });

    // Expect the response status code to be 400 Bad Request
    expect(response.status()).toBe(400);

    // Parse the response body as JSON
    const responseBody = await response.json();

    // Expect the response body to contain a 'message' field
    expect(responseBody).toHaveProperty('message');

    // Expect the message to indicate that the username is required
    expect(responseBody.message).toContain('username is required');
  });
});
