/**
 * Automatic Matching Service for Funding Opportunities
 * 
 * This service runs in the background and matches survivors (clients)
 * with funding opportunities based on eligibility criteria
 */
import { storage } from "../storage";

// Config
const MATCHING_INTERVAL_MINUTES = 30; // How often to run the matching service (in minutes)

// Convert to milliseconds for setInterval
const MATCHING_INTERVAL_MS = MATCHING_INTERVAL_MINUTES * 60 * 1000;

let matchingServiceRunning = false;

/**
 * Start the automatic matching service
 */
export function startMatchingService() {
  console.log(`Starting opportunity matching service (runs every ${MATCHING_INTERVAL_MINUTES} minutes)`);
  
  // Run once immediately
  runMatchingProcess();
  
  // Then set interval to run periodically
  setInterval(runMatchingProcess, MATCHING_INTERVAL_MS);
}

/**
 * Run the matching process if not already running
 */
async function runMatchingProcess() {
  // Skip if already running (prevent overlapping runs)
  if (matchingServiceRunning) {
    console.log("Matching service is already running, skipping scheduled run");
    return;
  }
  
  try {
    console.log("Running opportunity matching service...");
    matchingServiceRunning = true;
    
    // Call the matching engine
    const newMatchesCount = await storage.runMatchingEngine();
    
    console.log(`Opportunity matching complete. Found ${newMatchesCount} new matches.`);
  } catch (error) {
    console.error("Error running matching service:", error);
  } finally {
    matchingServiceRunning = false;
  }
}