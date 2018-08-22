// Let y be a vector of timeseries data of at least length lag+2
// Let mean() be a function that calculates the mean
// Let std() be a function that calculates the standard deviaton
// Let absolute() be the absolute value function

function detectPeaks(values) {
  // Settings (the ones below are examples: choose what is best for your data)
  const lag = 20;          // lag 5 for the smoothing functions
  const threshold = 3.5;  // 3.5 standard deviations for signal
  const influence = 0.5;  // between 0 and 1, where 1 is normal influence, 0.5 is half

  let count = 0;
  let detect = [];
  let avgFilter = [];
  let stdFilter = [];
  let filteredY = [];
  
  filteredY = values.slice(0, lag);

  for(let i=0; i<lag; i++ ) {
    avgFilter[i] = 0;
    stdFilter[i] = 0;
    detect[i] = 0;
  }
  avgFilter[lag-1] = math.mean(filteredY);
  stdFilter[lag-1] = math.std(filteredY);
  
  for(let i=lag; i<values.length; i++) {
    if(math.abs(values[i] - avgFilter[i-1]) > threshold*stdFilter[i-1]) {
      if(values[i] > avgFilter[i-1]) {
        detect[i] = 1;                     // Positive signal
      }
      else {
        detect[i] = -1;                     // Negative signal
        if(detect[i-1] === 0) {
          count++;
        }
      }
      // Make influence lower
      filteredY[i] = influence*values[i] + (1-influence)*filteredY[i-1];
    }
    else {
      detect[i] = 0;                        // No signal
      filteredY[i] = values[i];
    }
    // Adjust the filters
    avgFilter[i] = math.mean(filteredY.slice(i-lag, i));
    stdFilter[i] = math.std(filteredY.slice(i-lag, i));
  }
  //console.log('count:', count);
  return count;
}
