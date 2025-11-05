function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function batchProcess(items, fn, batchSize = 10, breathingGapMs = 10000) {
  const totalBatches = Math.ceil(items.length / batchSize);
  const startTime = Date.now();

  for (let i = 0; i < items.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);

    await Promise.all(batch.map(item => fn(item)));

    // Calculate and log progress
    const batchesDone = batchIndex;
    const batchesLeft = totalBatches - batchesDone;
    const elapsed = Date.now() - startTime;
    const avgTimePerBatch = elapsed / batchesDone;
    const estimatedRemainingTime = avgTimePerBatch * batchesLeft;
    const finishTime = new Date(Date.now() + estimatedRemainingTime);

    console.log(`Batch ${batchIndex}/${totalBatches} completed.`);
    console.log(
      `Estimated remaining time: ${Math.round(estimatedRemainingTime / 1000)} seconds.`
    );
    console.log(`Estimated finish time: ${finishTime.toLocaleString()}`);

    if (i + batchSize < items.length) {
      await sleep(breathingGapMs);
    }
  }
}
