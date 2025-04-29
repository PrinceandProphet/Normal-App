import { Request, Response, Router } from "express";
import { db } from "../db";
import { and, eq, inArray } from "drizzle-orm";
import { users, organizationMembers, organizationSurvivors, tasks } from "@shared/schema";

const router = Router();

// Get all clients (survivors) assigned to the logged-in practitioner
router.get("/practitioners/clients", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "case_manager") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const practitionerId = req.user.id;
    const practitionerOrgId = req.user.organizationId;

    if (!practitionerOrgId) {
      return res.status(400).json({ message: "Practitioner not associated with an organization" });
    }

    // Get all clients (survivors) in the practitioner's organization
    const orgSurvivors = await db
      .select({
        survivorId: organizationSurvivors.survivorId,
      })
      .from(organizationSurvivors)
      .where(eq(organizationSurvivors.organizationId, practitionerOrgId));

    if (!orgSurvivors.length) {
      return res.json([]);
    }

    const survivorIds = orgSurvivors.map((item) => item.survivorId);

    // Get the details of these survivors
    const clients = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        status: organizationSurvivors.status,
        isPrimary: organizationSurvivors.isPrimary,
        addedAt: organizationSurvivors.addedAt,
      })
      .from(users)
      .innerJoin(
        organizationSurvivors,
        and(
          eq(users.id, organizationSurvivors.survivorId),
          eq(organizationSurvivors.organizationId, practitionerOrgId)
        )
      )
      .where(inArray(users.id, survivorIds));

    res.json(clients);
  } catch (error) {
    console.error("Error fetching practitioner clients:", error);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
});

// Get all tasks assigned to the logged-in practitioner
router.get("/practitioners/tasks", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "case_manager") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const practitionerId = req.user.id;

    // Get all tasks assigned to this practitioner
    const practitionerTasks = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.assignedToId, practitionerId),
        eq(tasks.assignedToType, "practitioner")
      ));

    res.json(practitionerTasks);
  } catch (error) {
    console.error("Error fetching practitioner tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// Mock endpoint for appointments (since we don't have an appointments table yet)
// In a real implementation, this would fetch from an appointments/calendar table
router.get("/practitioners/appointments", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "case_manager") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // For now, return a placeholder empty array
    // This would normally come from a database query
    res.json([
      // Example data structure for future implementation
      /*
      {
        id: 1,
        title: "Initial Assessment",
        date: new Date().toISOString(), // future date
        clientId: 123,
        clientName: "John Doe",
        notes: "First meeting to assess needs",
        confirmed: true
      }
      */
    ]);
  } catch (error) {
    console.error("Error fetching practitioner appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

export default router;