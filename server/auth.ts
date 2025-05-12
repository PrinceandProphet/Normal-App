import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || 'disaster-recovery-secret-key';
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("📝 Registration request received:", { 
        username: req.body.username,
        email: req.body.email,
        role: req.body.role || '(not provided)',
        userType: req.body.userType || '(not provided)'
      });

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("❌ Registration failed: Username already exists");
        return res.status(400).json({ message: "Username already exists" });
      }

      // Set default role to 'user' and userType to 'survivor' if not specified
      // This ensures all newly registered users get restricted "survivor" access
      const userData = {
        ...req.body,
        role: req.body.role || 'user',
        userType: req.body.userType || 'survivor',
        password: await hashPassword(req.body.password),
      };

      console.log("✅ Creating new user with role:", userData.role, "and type:", userData.userType);
      
      const user = await storage.createUser(userData);
      console.log("👤 User created successfully:", { 
        id: user.id, 
        username: user.username,
        role: user.role,
        userType: user.userType
      });

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Login after registration failed:", err);
          return next(err);
        }
        console.log("🚀 User authenticated after registration");
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("❌ Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("🔑 Login attempt for:", req.body.username);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("❌ Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("❌ Login failed for:", req.body.username, "- Invalid credentials");
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      console.log("✅ Login successful for user:", { 
        id: user.id, 
        username: user.username,
        role: user.role,
        userType: user.userType
      });
      
      req.login(user, (err) => {
        if (err) {
          console.error("❌ Session creation error:", err);
          return next(err);
        }
        console.log("🚀 Session created successfully for:", user.username);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });
  
  // Password reset request endpoint
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      console.log("⚡️ Password reset request received:", req.body);
      
      const { email } = req.body;
      if (!email) {
        console.log("❌ Password reset failed: Email is required");
        return res.status(400).json({ message: "Email is required" });
      }

      console.log(`🔍 Looking up user with email: ${email}`);
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // For security reasons, we always return success even if the email doesn't exist
      // This prevents email fishing
      
      if (user) {
        console.log(`✅ User found for password reset: ${user.id} (${user.email}), type: ${user.userType}, role: ${user.role}`);
        
        // In a real implementation, you would:
        // 1. Generate a reset token and save it with an expiry time
        // 2. Send an email with a link containing the token
        
        // This is where we would typically send an email with a reset link
        // For now, we're just logging that it would happen
        console.log(`📧 [EMAIL WOULD BE SENT] Password reset link for: ${user.email}`);
        
        // Send password reset email logic would go here
        // await emailService.sendPasswordResetEmail(user.email, resetToken);
      } else {
        console.log(`⚠️ No user found with email: ${email}`);
      }
      
      // Always return success for security (prevents email fishing)
      console.log(`🔄 Returning success response for password reset request`);
      return res.status(200).json({ 
        success: true,
        message: "If an account exists with this email, a password reset link will be sent."
      });
    } catch (error) {
      console.error("❌ Error requesting password reset:", error);
      // Still return success for security
      return res.status(200).json({ 
        success: true,
        message: "If an account exists with this email, a password reset link will be sent."
      });
    }
  });
}