import { screen, waitForElementToBeRemoved } from '@testing-library/react'

/**
 * Helper function to wait for all loading states to resolve
 */
export async function waitForLoadingToComplete() {
  // Wait for loading spinner to disappear
  try {
    await waitForElementToBeRemoved(() => screen.queryByText('Loading Daily Challenge...'))
  } catch (e) {
    // Loading might have already completed, which is fine
  }

  // Wait for specific loading states
  try {
    await waitForElementToBeRemoved(() => screen.queryByText('Initializing dictionary...'))
  } catch (e) {
    // Dictionary might be already initialized
  }

  try {
    await waitForElementToBeRemoved(() => screen.queryByText('Checking authentication...'))
  } catch (e) {
    // Auth might be already checked
  }

  try {
    await waitForElementToBeRemoved(() => screen.queryByText('Loading profile...'))
  } catch (e) {
    // Profile might be already loaded
  }
}

/**
 * Helper function to ensure all context providers are ready
 */
export async function ensureContextsReady() {
  return new Promise<void>((resolve) => {
    // Use a small timeout to ensure all context effects have run
    setTimeout(resolve, 0)
  })
} 