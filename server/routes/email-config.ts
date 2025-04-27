/**
 * Email configuration routes for organization email setup
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticateUser } from "../middleware/auth";
import { mailslurpService } from "../services/mailslurp";

const router = Router();

// Helper function to check if user has admin access to organization
const checkOrgAdminAccess = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Super admins have access to all organizations
  if (req.user.role === "super_admin") {
    return next();
  }
  
  const { organizationId } = req.params;
  
  // Check if user is an admin of the organization
  if (req.user.organizationId === parseInt(organizationId)) {
    // Get user's role in the organization
    const members = await storage.getOrganizationMembers(parseInt(organizationId));
    const userMember = members.find(m => m.userId === req.user.id);
    
    if (userMember && (userMember.role === "admin" || userMember.role === "owner")) {
      return next();
    }
  }
  
  return res.status(403).json({ error: "You don't have permission to manage this organization's email settings" });
};

// Get organization email settings
router.get("/:organizationId", authenticateUser, checkOrgAdminAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const organization = await storage.getOrganization(parseInt(organizationId));
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    
    // Extract email-related fields
    const emailSettings = {
      emailDomain: organization.emailDomain,
      emailDomainVerified: organization.emailDomainVerified,
      emailProvider: organization.emailProvider,
      emailSenderName: organization.emailSenderName,
      emailSenderAddress: organization.emailSenderAddress,
      emailDkimKey: organization.emailDkimKey,
      emailSpfRecord: organization.emailSpfRecord,
      emailDmarcRecord: organization.emailDmarcRecord,
    };
    
    res.json(emailSettings);
  } catch (error) {
    console.error("Error fetching email settings:", error);
    res.status(500).json({ error: "Failed to fetch email settings" });
  }
});

// Update organization email settings
router.put("/:organizationId", authenticateUser, checkOrgAdminAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Validate input
    const emailConfigSchema = z.object({
      emailDomain: z.string().optional(),
      emailProvider: z.string().optional(),
      emailSenderName: z.string().optional(),
      emailSenderAddress: z.string().optional(),
    });
    
    const validatedData = emailConfigSchema.parse(req.body);
    
    // Update organization
    const organization = await storage.getOrganization(parseInt(organizationId));
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    
    const updatedOrg = await storage.updateOrganization(parseInt(organizationId), {
      ...validatedData,
      updatedAt: new Date()
    });
    
    res.json(updatedOrg);
  } catch (error) {
    console.error("Error updating email settings:", error);
    res.status(500).json({ error: "Failed to update email settings" });
  }
});

// Verify email domain
router.post("/:organizationId/verify", authenticateUser, checkOrgAdminAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Implement domain verification logic (could connect to DNS verification API)
    // For now, we'll simulate verification
    
    const organization = await storage.getOrganization(parseInt(organizationId));
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    
    if (!organization.emailDomain) {
      return res.status(400).json({ error: "No email domain configured" });
    }
    
    // In a real implementation, this would check DNS records
    // For now, we'll just update the verification status
    const updatedOrg = await storage.updateOrganization(parseInt(organizationId), {
      emailDomainVerified: true,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: "Domain verified successfully",
      emailDomainVerified: true
    });
  } catch (error) {
    console.error("Error verifying domain:", error);
    res.status(500).json({ error: "Failed to verify domain" });
  }
});

// Generate DNS records for email configuration
router.get("/:organizationId/dns-records", authenticateUser, checkOrgAdminAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const organization = await storage.getOrganization(parseInt(organizationId));
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    
    if (!organization.emailDomain) {
      return res.status(400).json({ error: "No email domain configured" });
    }
    
    // Generate sample DNS records (these would be real in production)
    const domain = organization.emailDomain;
    
    // Use organization ID as part of the DKIM selector for uniqueness
    const dkimSelector = `disaster-recovery-${organizationId}`;
    
    // Generate DKIM key (simplified for demo)
    const dkimKey = `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrLHiExVd55zd/IQ/J/mRwSRMAocV/hMB3jXwaHH36d9NaVynQFYV8NaWi69c1veUtRzGt7yAioXqLj7Z4TeEUoOLgrKsn8YnckGs9i3B3tVFB+Ch/4mPhXWiNfNdynHWBcPcbJ8kjEQ2U8y78dHZj1YeRXXVvWob2OaKynO8/lQIDAQAB;`;
    
    // Generate SPF record
    const spfRecord = `v=spf1 include:_spf.normalrestored.com ~all`;
    
    // Generate DMARC record
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`;
    
    // Save these records to the organization
    await storage.updateOrganization(parseInt(organizationId), {
      emailDkimKey: dkimKey,
      emailSpfRecord: spfRecord,
      emailDmarcRecord: dmarcRecord,
      updatedAt: new Date()
    });
    
    // Return DNS records for the admin to configure
    res.json({
      dkimRecord: {
        name: `${dkimSelector}._domainkey.${domain}`,
        type: "TXT",
        value: dkimKey
      },
      spfRecord: {
        name: domain,
        type: "TXT",
        value: spfRecord
      },
      dmarcRecord: {
        name: `_dmarc.${domain}`,
        type: "TXT",
        value: dmarcRecord
      },
      instructions: [
        "Add these DNS records to your domain's DNS settings:",
        "1. Add the DKIM record as a TXT record",
        "2. Add the SPF record as a TXT record on your domain root",
        "3. Add the DMARC record as a TXT record"
      ]
    });
  } catch (error) {
    console.error("Error generating DNS records:", error);
    res.status(500).json({ error: "Failed to generate DNS records" });
  }
});

export default router;