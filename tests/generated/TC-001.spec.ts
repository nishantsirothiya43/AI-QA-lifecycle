import { test, expect } from '@playwright/test';

// Group tests related to the simulated authentication or initial app interaction
test.describe('Initial application interaction (simulated "login" success)', () => {

  // Test case for successfully adding a todo item, acting as a "post-login" success indicator
  test('Successful interaction by adding a todo item', async ({ page }) => {
    // 1. Precondition: User is on the login page (TodoMVC homepage in this case)
    // Navigate to the TodoMVC application
    await page.goto('/todomvc/', { waitUntil: 'domcontentloaded' });

    // Define the new todo item text
    const todoText = 'Learn Playwright automation';

    // 2. Locate the input field for new todos by its placeholder text
    const newTodoInput = page.getByPlaceholder('What needs to be done?');
    // Expect the input field to be visible before interacting
    await expect(newTodoInput).toBeVisible();

    // 3. Enter the todo text into the input field
    await newTodoInput.fill(todoText);

    // 4. Press Enter to submit the new todo item
    await newTodoInput.press('Enter');

    // 5. Final Expected Outcome: Verify the new todo item is visible in the list
    // This acts as the "post-login experience" indicating successful interaction
    const todoItem = page.getByText(todoText);
    await expect(todoItem).toBeVisible();

    // Optionally, verify the count of active items if needed (e.g., 1 active item)
    const activeItemsCount = page.locator('.todo-count strong');
    await expect(activeItemsCount).toHaveText('1');
  });
});
