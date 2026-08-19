// Simple forecast: based on time-of-day pattern (mimics a trained model's output)
export function getForecast() {
  const currentHour = new Date().getHours();
  const tomorrowPeakHour = 13;

  // Predict tomorrow's generation using a bell-curve pattern (same logic AI would learn)
  const basePrediction = 20 * Math.exp(-Math.pow(tomorrowPeakHour - tomorrowPeakHour, 2) / 32);
  const totalDailyForecast = 145 + Math.floor(Math.random() * 10); // total kWh for the day

  return {
    predictedPeakGeneration: basePrediction.toFixed(1),
    predictedPeakTime: '1:00 PM',
    totalDailyForecast: totalDailyForecast,
    confidence: 87,
  };
}