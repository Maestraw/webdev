

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default  async function batchProcess(items, fn, batchSize = 10, breathingGapMs = 10000) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // Execute the function for each item in the batch, await all in parallel
    await Promise.all(batch.map(item => fn(item)));
    if (i + batchSize < items.length) {
      // Wait before next batch if there are more items
      await sleep(breathingGapMs);
    }
  }
}
