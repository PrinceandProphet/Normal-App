import { User } from "@shared/schema";
import { storage } from "../storage";
import { eq, and } from "drizzle-orm";
import { users, organizationSurvivors } from "@shared/schema";
import { db } from "../db";

/**
 * Service for organization and survivor access control
 */
export class AccessControlService {
  /**
   * Check if a user can access a survivor's data
   * @param currentUser The user requesting access
   * @param survivorId The ID of the survivor
   * @returns True if the user can access the survivor's data
   */
  async canAccessSurvivor(currentUser: User, survivorId: number): Promise<boolean> {
    // Super admins have access to all survivors
    if (currentUser.role === "super_admin") {
      return true;
    }

    // Survivor users can only access their own data
    if (currentUser.userType === "survivor") {
      return currentUser.id === survivorId;
    }

    // Practitioners need to be part of an organization that has access to the survivor
    if (currentUser.userType === "practitioner" && currentUser.organizationId) {
      // Check if the survivor is associated with the practitioner's organization and relationship is active
      const [relationship] = await db
        .select()
        .from(organizationSurvivors)
        .where(
          and(
            eq(organizationSurvivors.survivorId, survivorId),
            eq(organizationSurvivors.organizationId, currentUser.organizationId),
            eq(organizationSurvivors.status, "active")
          )
        );

      return !!relationship;
    }

    // Default deny access
    return false;
  }

  /**
   * Get all survivor IDs that a user has access to
   * @param currentUser The user requesting access
   * @returns Array of survivor IDs that the user can access
   */
  async getAccessibleSurvivorIds(currentUser: User): Promise<number[]> {
    // Super admins can access all survivors
    if (currentUser.role === "super_admin") {
      const survivors = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.userType, "survivor"));
      
      return survivors.map(s => s.id);
    }

    // Survivor users can only access themselves
    if (currentUser.userType === "survivor") {
      return [currentUser.id];
    }

    // Practitioners need an organization
    if (currentUser.userType === "practitioner" && currentUser.organizationId) {
      // Get all survivors associated with practitioner's organization with active status
      const relationships = await db
        .select()
        .from(organizationSurvivors)
        .where(
          and(
            eq(organizationSurvivors.organizationId, currentUser.organizationId),
            eq(organizationSurvivors.status, "active")
          )
        );
      
      return relationships.map(r => r.survivorId);
    }

    // Default to empty list
    return [];
  }

  /**
   * Filter a list of survivors to only those accessible by the user
   * @param currentUser The user requesting access
   * @param survivorIds The list of survivor IDs to filter
   * @returns Filtered list of survivor IDs that the user can access
   */
  async filterAccessibleSurvivors(currentUser: User, survivorIds: number[]): Promise<number[]> {
    const accessibleIds = await this.getAccessibleSurvivorIds(currentUser);
    return survivorIds.filter(id => accessibleIds.includes(id));
  }

  /**
   * Check if a user belongs to the same organization as another user
   * @param currentUser The user requesting access
   * @param userId The ID of the user to check
   * @returns True if the users are in the same organization
   */
  async isSameOrganization(currentUser: User, userId: number): Promise<boolean> {
    // Super admins can access all users
    if (currentUser.role === "super_admin") {
      return true;
    }

    // If the current user has no organization, they can't be in the same org
    if (!currentUser.organizationId) {
      return false;
    }

    // Check if the target user is in the same organization
    const targetUser = await storage.getUser(userId);
    if (!targetUser || !targetUser.organizationId) {
      return false;
    }

    return currentUser.organizationId === targetUser.organizationId;
  }
}

export const accessControlService = new AccessControlService();