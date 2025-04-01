const progressMap = {};

function setProgress(processId, progress) {
  progressMap[processId] = progress;
}

function getProgress(processId) {
  return progressMap[processId] || "Unknown process ID";
}

module.exports = {
  setProgress,
  getProgress,
};