
// Function to update and display progress
function updateProgress(current, total, clearLine = true) {
    if (!process.stdout.isTTY) {
        return;
    }

    if (clearLine) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
    }
    const progress = (current / total) * 100;
    process.stdout.write(`Processing: ${progress.toFixed(2)}%`);
}

export default { updateProgress }