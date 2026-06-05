# Performance Benchmark Template

## Device Information

| Field | Value |
|-------|-------|
| Device Model | |
| Android Version | |
| RAM | |
| Processor | |
| Camera Spec | |
| Test Date | |

## Face Recognition Benchmarks

| Test | Run 1 | Run 2 | Run 3 | Average |
|------|-------|-------|-------|---------|
| Model Load Time (ms) | | | | |
| Embedding Generation (ms) | | | | |
| Face Verification (ms) | | | | |
| Cosine Similarity (ms) | | | | |

## Liveness Detection Benchmarks

| Test | Run 1 | Run 2 | Run 3 | Average |
|------|-------|-------|-------|---------|
| Blink Detection (ms) | | | | |
| Smile Detection (ms) | | | | |
| Head Turn Left (ms) | | | | |
| Head Turn Right (ms) | | | | |
| Full Session (ms) | | | | |

## Attendance Flow

| Test | Run 1 | Run 2 | Run 3 | Average |
|------|-------|-------|-------|---------|
| User Selection (ms) | | | | |
| GPS Acquisition (ms) | | | | |
| SQLite Write (ms) | | | | |
| Full Attendance (ms) | | | | |

## Sync Benchmarks

| Test | Run 1 | Run 2 | Run 3 | Average |
|------|-------|-------|-------|---------|
| Connectivity Check (ms) | | | | |
| Single Record Upload (ms) | | | | |
| Batch Upload (10 records) (ms) | | | | |

## Lighting Condition Tests

| Condition | Recognition Confidence | Success |
|-----------|----------------------|---------|
| Normal Office Light | | |
| Bright Sunlight | | |
| Low Light (<50 lux) | | |
| Side Shadow | | |
| Backlight | | |

## Memory Usage

| State | Memory (MB) |
|-------|-------------|
| App Start | |
| After Model Load | |
| During Recognition | |
| After Liveness Session | |
| Idle | |

## Model Footprint

| Model | Size (MB) |
|-------|-----------|
| arcfaceresnet100-11-int8.onnx | ~23 |
| version-RFB-320-int8.onnx | ~1.5 |
| Total | ~24.5 |

## Notes

- Test in various lighting conditions
- Test on multiple devices if available
- Record any failures or anomalies
- Battery drain during continuous use
