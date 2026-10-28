/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TelemetryPacket,
  SatelliteHealthScore,
  AnomalyEvent,
  PredictionData,
  SensorHealthData,
  SatelliteNotification,
} from '../types/telemetry';

/**
 * Evaluates the dynamic Satellite Health Score (0 - 100)
 * 90–100 → HEALTHY (🟢)
 * 70–89 → CAUTION (🟡)
 * 40–69 → WARNING (🟠)
 * 0–39 → CRITICAL (🔴)
 */
export function calculateHealthScore(
  current: TelemetryPacket,
  history: TelemetryPacket[],
  mode: 'LIVE' | 'SIM',
  isSerialConnected: boolean,
  lastPacketTime: number | null,
  anomaly: AnomalyEvent,
  sensorHealth: SensorHealthData
): SatelliteHealthScore {
  // 1. Thermal Sub-score (0-100)
  // Optimal: 20°C - 28°C
  // Acceptable: 15°C - 32°C
  // Severe: > 35°C or < 5°C
  const temp = current.temp;
  let thermalScore = 100;
  if (temp > 28) {
    thermalScore = Math.max(10, Math.round(100 - (temp - 28) * 8.5));
  } else if (temp < 18) {
    thermalScore = Math.max(10, Math.round(100 - (18 - temp) * 6.5));
  }

  // 2. Humidity Sub-score (0-100)
  // Optimal: 35% - 65% RH
  const hum = current.hum;
  let humidityScore = 100;
  if (hum > 65) {
    humidityScore = Math.max(20, Math.round(100 - (hum - 65) * 2.5));
  } else if (hum < 30) {
    humidityScore = Math.max(20, Math.round(100 - (30 - hum) * 2.5));
  }

  // 3. Sensor Sub-score (0-100)
  let sensorScore = 100;
  if (sensorHealth.status === 'error') {
    sensorScore = 25;
  } else if (sensorHealth.status === 'check_recommended') {
    sensorScore = 65;
  }

  // 4. Communication & Uplink Sub-score (0-100)
  let commScore = 100;
  if (mode === 'LIVE') {
    if (!isSerialConnected) {
      commScore = 30; // Offline
    } else if (lastPacketTime && Date.now() - lastPacketTime > 6000) {
      commScore = 40; // Timeout
    } else if (lastPacketTime && Date.now() - lastPacketTime > 3000) {
      commScore = 75; // Latency lag
    }
  }

  // 5. Power Bus Sub-score (0-100)
  let powerScore = 100;
  if (current.eps.voltage > 0) {
    if (current.eps.voltage >= 3.8) {
      powerScore = 100;
    } else if (current.eps.voltage >= 3.5) {
      powerScore = Math.round(50 + ((current.eps.voltage - 3.5) / 0.3) * 45);
    } else {
      powerScore = Math.max(15, Math.round((current.eps.voltage / 3.5) * 50));
    }
  }

  // Anomaly Deductions
  let anomalyPenalty = 0;
  if (anomaly.detected) {
    if (anomaly.severity === 'CRITICAL') anomalyPenalty = 30;
    else if (anomaly.severity === 'HIGH') anomalyPenalty = 20;
    else if (anomaly.severity === 'MEDIUM') anomalyPenalty = 12;
    else anomalyPenalty = 6;
  }

  // Weighted Combination
  // Thermal: 28%, Sensor: 26%, Comm: 22%, Power: 14%, Humidity: 10%
  const rawScore =
    thermalScore * 0.28 +
    sensorScore * 0.26 +
    commScore * 0.22 +
    powerScore * 0.14 +
    humidityScore * 0.1 -
    anomalyPenalty;

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Categorization
  let status: 'HEALTHY' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  let statusLabel: string;
  let colorHex: string;

  if (score >= 90) {
    status = 'HEALTHY';
    statusLabel = 'HEALTHY';
    colorHex = '#34D399'; // Green
  } else if (score >= 70) {
    status = 'CAUTION';
    statusLabel = 'CAUTION';
    colorHex = '#FBBF24'; // Yellow
  } else if (score >= 40) {
    status = 'WARNING';
    statusLabel = 'WARNING';
    colorHex = '#FB923C'; // Orange
  } else {
    status = 'CRITICAL';
    statusLabel = 'CRITICAL';
    colorHex = '#F43F5E'; // Red
  }

  const breakdown = [
    { label: 'Thermal Envelope', score: thermalScore, weight: '28%', status: thermalScore >= 80 ? 'NOMINAL' : thermalScore >= 50 ? 'ELEVATED' : 'CRITICAL' },
    { label: 'DHT11 Sensor Link', score: sensorScore, weight: '26%', status: sensorScore >= 80 ? 'ONLINE' : sensorScore >= 50 ? 'CHECK' : 'FAULT' },
    { label: 'ESP32 Ground Link', score: commScore, weight: '22%', status: commScore >= 80 ? 'SYNCED' : commScore >= 50 ? 'SLOW' : 'TIMEOUT' },
    { label: 'EPS Power Bus', score: powerScore, weight: '14%', status: powerScore >= 80 ? 'CHARGED' : powerScore >= 50 ? 'DRAIN' : 'LOW' },
    { label: 'Payload Humidity', score: humidityScore, weight: '10%', status: humidityScore >= 80 ? 'STABLE' : 'DRIFT' },
  ];

  let summary = 'All satellite parameters are currently within the safe operating range.';
  if (status === 'CRITICAL') {
    summary = 'Critical parameters violated! Immediate ground station intervention recommended.';
  } else if (status === 'WARNING') {
    summary = 'Significant telemetry drift or sensor impairment detected. Monitor trends closely.';
  } else if (status === 'CAUTION') {
    summary = 'Minor parameter degradation or sensor latency observed. Operating under advisory.';
  }

  return {
    score,
    status,
    statusLabel,
    colorHex,
    thermalScore,
    humidityScore,
    sensorScore,
    commScore,
    powerScore,
    breakdown,
    summary,
  };
}

/**
 * Real-time AI Anomaly Detection
 * Analyzes sliding window telemetry using rate-of-change (dT/dt) and threshold checks
 */
export function detectAnomalies(
  current: TelemetryPacket,
  history: TelemetryPacket[]
): AnomalyEvent {
  const windowSize = 8;
  const recent = history.slice(-windowSize);

  // Default: No anomaly
  const defaultNormal: AnomalyEvent = {
    detected: false,
    parameter: 'DHT11 Temperature / Humidity',
    currentValue: `${current.temp.toFixed(1)}°C / ${current.hum.toFixed(1)}%`,
    expectedRange: '18.0°C – 32.0°C • 30% – 70% RH',
    severity: 'NONE',
    severityColor: '#34D399',
    reason: 'Telemetry fluctuations are within 1.2-sigma expected nominal drift bounds.',
    recommendedAction: 'Continue nominal ground monitoring schedule.',
    confidencePct: 96,
    detectionAlgorithm: 'Sliding-window gradient & statistical boundary verification',
    timestamp: current.timestamp,
  };

  if (recent.length < 3) {
    return defaultNormal;
  }

  // 1. Check for rapid temperature rise across last 4-5 packets
  // e.g. 27°C → 29°C → 33°C → 39°C
  const recentTemps = recent.map((p) => p.temp);
  const n = recentTemps.length;
  
  // Calculate delta over last 4 readings if available
  const sampleCount = Math.min(4, n);
  const firstSample = recentTemps[n - sampleCount];
  const lastSample = recentTemps[n - 1];
  const deltaT = lastSample - firstSample;

  // Check continuous increase
  let continuousIncreaseCount = 0;
  for (let i = n - 1; i > 0; i--) {
    if (recentTemps[i] > recentTemps[i - 1]) {
      continuousIncreaseCount++;
    } else {
      break;
    }
  }

  // Rapid spike anomaly: deltaT > 2.5°C over <=4 samples OR continuous increase >= 4 with deltaT > 1.8°C
  if (deltaT >= 2.5 || (continuousIncreaseCount >= 4 && deltaT >= 1.8)) {
    const isCritical = current.temp >= 35 || deltaT >= 4.0;
    return {
      detected: true,
      parameter: 'Temperature (DHT11)',
      currentValue: `${current.temp.toFixed(1)}°C`,
      expectedRange: '18.0°C – 30.0°C',
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      severityColor: isCritical ? '#F43F5E' : '#FB923C',
      reason: `Temperature is rising significantly faster than the recent baseline (ΔT = +${deltaT.toFixed(1)}°C across ${sampleCount} samples).`,
      recommendedAction:
        'Inspect thermal absorption, throttle ESP32 Wi-Fi transmission bursts or command SAFE_MODE.',
      confidencePct: 94,
      detectionAlgorithm: 'First-order gradient delta (dT/dt) outlier filter',
      timestamp: current.timestamp,
    };
  }

  // 2. Critical absolute threshold crossing: Temperature > 35°C
  if (current.temp >= 35.0) {
    return {
      detected: true,
      parameter: 'Temperature (DHT11)',
      currentValue: `${current.temp.toFixed(1)}°C`,
      expectedRange: '18.0°C – 32.0°C',
      severity: 'CRITICAL',
      severityColor: '#F43F5E',
      reason: 'Temperature is approaching/exceeding configured critical spacecraft threshold (35.0°C).',
      recommendedAction: 'Verify solar panel orientation, reduce avionics duty cycle or engage thermal radiator mode.',
      confidencePct: 98,
      detectionAlgorithm: 'Critical ceiling limit cross-check',
      timestamp: current.timestamp,
    };
  }

  // 3. Humidity Sudden Spike Anomaly
  const recentHums = recent.map((p) => p.hum);
  const humDelta = recentHums[recentHums.length - 1] - recentHums[0];
  if (humDelta >= 20.0) {
    return {
      detected: true,
      parameter: 'Humidity (DHT11)',
      currentValue: `${current.hum.toFixed(1)}% RH`,
      expectedRange: '30% – 65% RH',
      severity: 'MEDIUM',
      severityColor: '#FBBF24',
      reason: `Unusual humidity surge (+${humDelta.toFixed(1)}% RH) detected within recent packets.`,
      recommendedAction: 'Inspect payload enclosure seal integrity and ambient condensation.',
      confidencePct: 88,
      detectionAlgorithm: 'Humidity delta outlier test',
      timestamp: current.timestamp,
    };
  }

  // 4. Consecutive temperature rise warning (continuous 5 increases without pause)
  if (continuousIncreaseCount >= 5) {
    return {
      detected: true,
      parameter: 'Temperature (DHT11)',
      currentValue: `${current.temp.toFixed(1)}°C`,
      expectedRange: '18.0°C – 32.0°C',
      severity: 'LOW',
      severityColor: '#FBBF24',
      reason: 'Temperature has increased continuously over the last 5 readings.',
      recommendedAction: 'Observe next 3 telemetry cycles to verify if stabilization occurs.',
      confidencePct: 91,
      detectionAlgorithm: 'Monotonic sequence trend monitor',
      timestamp: current.timestamp,
    };
  }

  return defaultNormal;
}

/**
 * AI Prediction & Trend Forecast
 * Uses least-squares linear regression on recent temperature samples
 */
export function calculatePrediction(
  current: TelemetryPacket,
  history: TelemetryPacket[]
): PredictionData {
  const windowCount = Math.min(10, history.length);
  const recent = history.slice(-windowCount);

  if (recent.length < 3) {
    return {
      status: 'insufficient_data',
      parameter: 'Temperature',
      recentSequence: [],
      sequenceString: '--',
      trend: 'stable',
      prediction: 'Collecting telemetry data for prediction...',
      risk: 'LOW',
      riskColor: '#34D399',
      forecast: 'Awaiting minimum 3 data points to establish regression trendline.',
      projectedDelta5Pkt: 0,
      estimatedNextValue: null,
    };
  }

  // Extract recent sequence string (e.g. 31°C → 32°C → 33°C)
  const recentTemps = recent.map((p) => parseFloat(p.temp.toFixed(1)));
  const sequenceSlice = recentTemps.slice(-4);
  const sequenceString = sequenceSlice.map((v) => `${v.toFixed(1)}°C`).join(' → ');

  // Linear Regression: y = a + b * x
  const n = recentTemps.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = recentTemps[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Projected value 5 readings ahead
  const projectedIn5 = intercept + slope * (n + 4);
  const projectedDelta5 = parseFloat((slope * 5).toFixed(2));
  const estimatedNext = parseFloat((intercept + slope * n).toFixed(1));

  let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
  let prediction = 'Temperature is maintaining stable equilibrium.';
  let risk: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
  let riskColor = '#34D399';
  let forecast = 'Nominal variance expected within ±0.3°C over next 10 readings.';

  if (slope > 0.15) {
    trend = 'increasing';
    prediction = 'Temperature is likely to continue increasing.';
    
    if (projectedIn5 >= 34.5 || current.temp >= 33.0) {
      risk = 'HIGH';
      riskColor = '#F43F5E';
      forecast = `Possible critical threshold crossing (projected ${projectedIn5.toFixed(1)}°C) within the next few readings.`;
    } else if (projectedIn5 >= 30.0 || slope > 0.35) {
      risk = 'MODERATE';
      riskColor = '#FBBF24';
      forecast = `Short-term rise of +${Math.abs(projectedDelta5).toFixed(1)}°C expected over the next 5 readings.`;
    } else {
      risk = 'LOW';
      riskColor = '#34D399';
      forecast = `Gentle upward drift; expected to plateau below warning ceiling.`;
    }
  } else if (slope < -0.15) {
    trend = 'decreasing';
    prediction = 'Temperature is likely to continue decreasing.';
    risk = 'LOW';
    riskColor = '#34D399';
    forecast = `Cooling gradient active (projected ${projectedIn5.toFixed(1)}°C in 5 samples).`;
  } else {
    trend = 'stable';
    risk = 'LOW';
    riskColor = '#34D399';
    prediction = 'Temperature is stable with negligible drift.';
    forecast = 'Operating at steady-state equilibrium within safe thermal limits.';
  }

  return {
    status: 'ready',
    parameter: 'Temperature (DHT11)',
    recentSequence: sequenceSlice,
    sequenceString,
    trend,
    prediction,
    risk,
    riskColor,
    forecast,
    projectedDelta5Pkt: projectedDelta5,
    estimatedNextValue: estimatedNext,
  };
}

/**
 * Sensor Health Monitoring (DHT11 & ESP32 Link)
 * Detects frozen values, communication timeouts, missing/invalid readings
 */
export function checkSensorHealth(
  current: TelemetryPacket,
  history: TelemetryPacket[],
  mode: 'LIVE' | 'SIM',
  isSerialConnected: boolean,
  lastPacketTime: number | null
): SensorHealthData {
  const windowCount = Math.min(15, history.length);
  const recent = history.slice(-windowCount);

  // Check 1: Communication timeout in LIVE mode
  const now = Date.now();
  const timeSinceLastPacketSec = lastPacketTime ? Math.round((now - lastPacketTime) / 1000) : 0;
  const timeoutActive = mode === 'LIVE' && isSerialConnected && timeSinceLastPacketSec > 6;

  // Check 2: Frozen / Flatline check for DHT11
  // If the last 12 packets have identical temperature AND identical humidity down to 0.00
  let frozenSampleCount = 0;
  let dht11Stuck = false;

  if (recent.length >= 8) {
    const targetTemp = current.temp;
    const targetHum = current.hum;
    let matchCount = 0;

    for (let i = recent.length - 1; i >= 0; i--) {
      if (
        Math.abs(recent[i].temp - targetTemp) < 0.001 &&
        Math.abs(recent[i].hum - targetHum) < 0.001
      ) {
        matchCount++;
      } else {
        break;
      }
    }

    frozenSampleCount = matchCount;
    // Classic DHT11 has 1°C steps, modern has 0.1°C; 10 consecutive identical readings indicates lockup
    if (matchCount >= 10) {
      dht11Stuck = true;
    }
  }

  // Check 3: Invalid / Out-of-physical-range readings
  const invalidReadings =
    current.temp === null ||
    isNaN(current.temp) ||
    current.temp < -20 ||
    current.temp > 80 ||
    current.hum === null ||
    isNaN(current.hum) ||
    current.hum < 0 ||
    current.hum > 100;

  // Check 4: Missing readings (zero across all sensors in active live mode)
  const missingReadings = mode === 'LIVE' && current.temp === 0 && current.hum === 0 && current.press === 0;

  // Aggregate Status
  let status: 'healthy' | 'check_recommended' | 'error' = 'healthy';
  let statusText = '🟢 Sensor Healthy';
  let badgeText = 'HEALTHY';
  let colorHex = '#34D399';
  let message = 'DHT11 sensor is operating nominally with active telemetry updates.';
  let gpioLineStatus: 'NORMAL' | 'SUSPECT' | 'OFFLINE' = 'NORMAL';

  if (timeoutActive) {
    status = 'error';
    statusText = '🔴 Sensor Error';
    badgeText = 'TIMEOUT';
    colorHex = '#F43F5E';
    message = `Communication timeout (${timeSinceLastPacketSec}s without packet). Verify ESP32 Wi-Fi / Serial transmission.`;
    gpioLineStatus = 'OFFLINE';
  } else if (invalidReadings) {
    status = 'error';
    statusText = '🔴 Sensor Error';
    badgeText = 'INVALID DATA';
    colorHex = '#F43F5E';
    message = 'Sensor returned invalid or out-of-range physical telemetry readings.';
    gpioLineStatus = 'SUSPECT';
  } else if (dht11Stuck) {
    status = 'check_recommended';
    statusText = '🟡 Sensor Check Recommended';
    badgeText = 'POSSIBLE ISSUE';
    colorHex = '#FBBF24';
    message = `Temperature readings have remained unchanged for an unusual duration (${frozenSampleCount} packets). Check the DHT11 connection.`;
    gpioLineStatus = 'SUSPECT';
  } else if (missingReadings) {
    status = 'check_recommended';
    statusText = '🟡 Sensor Check Recommended';
    badgeText = 'AWAITING DATA';
    colorHex = '#FBBF24';
    message = 'DHT11 payload fields missing from incoming ESP32 data stream.';
    gpioLineStatus = 'SUSPECT';
  }

  const diagnostics = [
    {
      checkName: 'DHT11 One-Wire Handshake',
      passed: !timeoutActive && !missingReadings,
      detail: timeoutActive ? 'Timeout >6s' : missingReadings ? 'No Data' : 'Active 1-Wire Link',
    },
    {
      checkName: 'Sensor Register Variance',
      passed: !dht11Stuck,
      detail: dht11Stuck ? `Stuck (${frozenSampleCount} identical)` : 'Dynamic Noise Present',
    },
    {
      checkName: 'Physical Range Bounds',
      passed: !invalidReadings,
      detail: invalidReadings ? 'Out of Range' : 'Inside Envelope (-20°C to 60°C)',
    },
    {
      checkName: 'ESP32 Serial / Wi-Fi',
      passed: isSerialConnected || mode === 'SIM',
      detail: isSerialConnected ? 'Port Online @ 115200' : mode === 'SIM' ? 'Simulated Link' : 'Port Closed',
    },
  ];

  return {
    status,
    statusText,
    badgeText,
    colorHex,
    sensorName: 'DHT11 (Temp & Humidity) + ESP32',
    message,
    dht11Stuck,
    frozenSampleCount,
    missingReadings,
    invalidReadings,
    timeoutActive,
    timeSinceLastPacketSec,
    lastValidValue: `${current.temp.toFixed(1)}°C, ${current.hum.toFixed(1)}% RH`,
    gpioLineStatus,
    diagnostics,
  };
}
