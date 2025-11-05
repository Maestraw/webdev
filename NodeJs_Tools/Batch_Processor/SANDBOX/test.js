import batchProcess from "../JS/BATCH_PROCESSOR.js";

// Sample array of items
const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Example async function to apply to each item
async function processItem(item) {
  console.log("Processing item:", item);
  // Simulate some async work (e.g. API call)
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Main entry point
async function main() {
  try {
    await batchProcess(items, processItem, 1, 5000); // process 5 items per batch, 20 seconds gap between batches
    console.log("All batches processed!");
  } catch (err) {
    console.error("Error during batch processing:", err);
  }
}

main();
