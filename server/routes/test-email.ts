import { Router } from "express";
import { emailService } from "../services/email-simplified";

const router = Router();

// Test endpoint for sending emails directly
router.post("/test-email", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { to, subject, text, html } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({ message: "Missing required fields: to, subject" });
    }
    
    console.log("Attempting to send test email to:", to);
    
    try {
      // Try direct Brevo API call first
      const directApiResult = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY!,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: 'Normal Restored Test',
            email: 'noreply@normalrestored.com',
          },
          to: [
            {
              email: to,
              name: to.split('@')[0]
            }
          ],
          subject: subject || "Test Email from Normal Restored",
          htmlContent: html || "<p>This is a test email from Normal Restored.</p>",
          textContent: text || "This is a test email from Normal Restored."
        })
      });

      const directApiResponse = await directApiResult.json();
      console.log("Direct API response:", directApiResponse);
      
      // Then use our service
      const result = await emailService.sendEmail(
        to,
        subject || "Test Email from Normal Restored",
        text || "This is a test email from Normal Restored.",
        html
      );
      
      return res.json({ 
        success: true, 
        message: "Test email sent",
        directApiResult: directApiResponse,
        serviceResult: result
      });
    } catch (error) {
      console.error("Error in test email route:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error sending test email", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Test email endpoint error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;