/**
 * Authentication middleware for protecting routes
 */

import { Request, Response, NextFunction } from 'express';

// Middleware to check if the user is authenticated
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Middleware to check if the user is an admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};

// Middleware to check if the user is a super admin
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  
  next();
};

// Middleware to check if the user is a practitioner
export const requirePractitioner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.userType !== 'practitioner') {
    return res.status(403).json({ message: "Practitioner access required" });
  }
  
  next();
};

// Middleware to check if the user is a survivor
export const requireSurvivor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user?.userType !== 'survivor') {
    return res.status(403).json({ message: "Survivor access required" });
  }
  
  next();
};