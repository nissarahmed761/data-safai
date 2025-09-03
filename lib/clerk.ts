import { clerkClient } from '@clerk/nextjs/server';

export const clerkConfig = {
  // Add any custom Clerk configuration here
  // This file can be extended with custom functions and configurations
};

// Helper function to get user by ID
export async function getUserById(userId: string) {
  try {
    return await clerkClient.users.getUser(userId);
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Helper function to update user metadata
export async function updateUserMetadata(userId: string, metadata: any) {
  try {
    return await clerkClient.users.updateUser(userId, {
      publicMetadata: metadata,
    });
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
} 