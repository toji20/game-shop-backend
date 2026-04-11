// memory-monitor.ts
export function startMemoryMonitor(intervalMs = 3000) {
  const bar = (used: number, total: number, length = 30) => {
    const ratio = used / total;
    const filled = Math.round(ratio * length);
    return '▮'.repeat(filled) + '▯'.repeat(length - filled);
  };

  setInterval(() => {
    const { heapUsed, heapTotal, rss } = process.memoryUsage();
    const usedMB = (heapUsed / 1024 / 1024).toFixed(2);
    const totalMB = (heapTotal / 1024 / 1024).toFixed(2);
    const rssMB = (rss / 1024 / 1024).toFixed(2);

    console.clear();
    console.log('📊 Memory Usage');
    console.log(`Heap: ${usedMB}MB / ${totalMB}MB ${bar(heapUsed, heapTotal)}`);
    console.log(`RSS:  ${rssMB}MB`);
  }, intervalMs);
}
