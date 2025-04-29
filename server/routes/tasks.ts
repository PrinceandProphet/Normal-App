import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { tasks, insertTaskSchema } from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

const router = Router();

// Get all tasks for a specific organization
router.get("/organization", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Extract organization ID from the user
  const organizationId = req.user.organizationId;
  if (!organizationId) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  // Check if user has access to this organization's tasks
  const canAccess =
    req.user.role === "super_admin" ||
    req.user.role === "admin" ||
    req.user.organizationId === organizationId;

  if (!canAccess) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Get all tasks for survivors associated with this organization
    const orgTasks = await storage.getOrganizationTasks(organizationId);
    return res.json(orgTasks);
  } catch (error) {
    console.error("Error getting organization tasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new task for a survivor in an organization
router.post("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Only authenticated users in the organization can create tasks
  if (!req.user.organizationId) {
    return res.status(403).json({ message: "Access denied: Not in an organization" });
  }

  try {
    // Parse and validate the task data
    const taskData = insertTaskSchema.parse({
      ...req.body,
      organizationId: req.user.organizationId,
      createdById: req.user.id
    });

    // Create the task
    const task = await storage.createTask(taskData);
    return res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update a task
router.patch("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    // Get the task to check permissions
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to update this task
    const canUpdate =
      req.user.role === "super_admin" ||
      (req.user.role === "admin" && req.user.organizationId === task.organizationId) ||
      (req.user.organizationId === task.organizationId && req.user.id === task.assignedToId) ||
      (req.user.organizationId === task.organizationId && req.user.id === task.createdById);

    if (!canUpdate) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update the task
    const updatedTask = await storage.updateTask(taskId, req.body);
    return res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a task
router.delete("/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    // Get the task to check permissions
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to delete this task
    const canDelete =
      req.user.role === "super_admin" ||
      (req.user.role === "admin" && req.user.organizationId === task.organizationId) ||
      (req.user.organizationId === task.organizationId && req.user.id === task.createdById);

    if (!canDelete) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete the task
    await storage.deleteTask(taskId);
    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;