import { Router } from 'express';
import { getEnvironment } from '../config';

/**
 * Enhanced Brevo API email testing route
 * This route provides detailed error handling and logging for troubleshooting Brevo email integration
 */
const router = Router();

/**
 * Test Brevo API key validity
 * Checks if the API key can successfully connect to Brevo
 */
router.get('/test-brevo-connection', async (req, res) => {
  try {
    // Only allow in development environment and for admin users
    if (getEnvironment() !== 'development') {
      return res.status(403).json({ 
        success: false, 
        message: 'This endpoint is only available in development environment' 
      });
    }

    if (!req.isAuthenticated() || req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized. Only super admins can access this endpoint' 
      });
    }

    // Test the Brevo API key by making a simple request to the account endpoint
    console.log('🔑 Testing Brevo API key validity...');
    
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('❌ No Brevo API key found in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Brevo API key is not configured',
        details: 'The BREVO_API_KEY environment variable is not set'
      });
    }

    // Make a request to the account info endpoint to verify API key works
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Brevo API key validation failed:', data);
      return res.status(response.status).json({
        success: false,
        message: 'Brevo API key validation failed',
        status: response.status,
        statusText: response.statusText,
        details: data
      });
    }

    console.log('✅ Brevo API key is valid!');
    console.log('📊 Account information:', {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      plan: data.plan?.[0]?.type
    });

    return res.json({
      success: true,
      message: 'Brevo API key is valid',
      accountInfo: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        plan: data.plan?.[0]?.type
      }
    });
  } catch (error) {
    console.error('❌ Error testing Brevo API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing Brevo API key',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Send a test email using Brevo API
 * Includes detailed error handling and response logging
 */
router.post('/test-brevo-email', async (req, res) => {
  try {
    // Only allow in development environment and for admin users
    if (getEnvironment() !== 'development') {
      return res.status(403).json({ 
        success: false, 
        message: 'This endpoint is only available in development environment' 
      });
    }

    if (!req.isAuthenticated() || req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized. Only super admins can access this endpoint' 
      });
    }

    const { to, subject, text, html, fromName, fromEmail } = req.body;
    
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: to (recipient email)' 
      });
    }
    
    // Prepare email data with defaults for optional fields
    const emailData = {
      sender: {
        name: fromName || 'Normal Restored Test',
        email: fromEmail || 'noreply@normalrestored.com',
      },
      to: [
        {
          email: to,
          name: to.split('@')[0] // Use part before @ as name
        }
      ],
      subject: subject || 'Test Email from Normal Restored',
      htmlContent: html || '<p>This is a test email from Normal Restored.</p><p>If you received this, the email system is working correctly!</p>',
      textContent: text || 'This is a test email from Normal Restored. If you received this, the email system is working correctly!',
      tags: ['test', 'development']
    };
    
    console.log('📧 Attempting to send test email to:', to);
    console.log('📧 Email data:', JSON.stringify(emailData, null, 2));
    
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('❌ No Brevo API key found in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Brevo API key is not configured',
        details: 'The BREVO_API_KEY environment variable is not set',
        emailData
      });
    }
    
    // Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
        console.error('❌ Brevo API error:', errorData);
      } catch (e) {
        console.error(`❌ Brevo API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Response text: ${errorText}`);
        errorData = errorText;
      }
      
      return res.status(response.status).json({
        success: false,
        message: 'Failed to send test email',
        status: response.status,
        statusText: response.statusText,
        errorDetails: errorData,
        emailData
      });
    }
    
    // Process successful response
    const responseData = await response.json();
    console.log('✅ Email sent successfully!');
    console.log('📊 Brevo API response:', responseData);
    
    return res.json({
      success: true,
      message: 'Test email sent successfully',
      recipient: to,
      messageId: responseData.messageId,
      emailData
    });
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;