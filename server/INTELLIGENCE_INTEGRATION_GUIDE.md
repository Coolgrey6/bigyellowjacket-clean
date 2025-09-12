# Big Yellow Jacket - Enhanced Intelligence Integration Guide

## Overview
This guide explains how to integrate the enhanced network intelligence features that have been added to the Big Yellow Jacket monitoring system.

## New Features Added

### 1. Real IP Geolocation Service
- **Location**: `src/analyzers/intelligence.py` - `get_location_info()` method
- **Features**: 
  - Multiple geolocation providers (ip-api.com, ipapi.co, ipinfo.io)
  - Fallback mechanisms for reliability
  - Caching for performance
  - Private IP detection

### 2. Advanced Threat Detection
- **DGA Domain Detection**: Detects Domain Generation Algorithm patterns
- **Threat Actor Infrastructure**: Checks against known threat actor IP ranges
- **Fast-Flux Network Detection**: Identifies fast-flux networks
- **C2 Pattern Detection**: Detects Command & Control communication patterns
- **Suspicious Port Combinations**: Identifies known malicious port combinations

### 3. Enhanced Traffic Analysis
- **Payload Size Analysis**: Detects unusual payload patterns
- **Encryption Detection**: Advanced encrypted traffic analysis
- **Timing Pattern Recognition**: Identifies beaconing and regular communication patterns
- **Data Exfiltration Detection**: Flags potential data exfiltration attempts

### 4. Process Risk Assessment
- **Entropy Analysis**: Detects processes with random-looking names
- **Resource Usage Monitoring**: Flags high CPU/memory usage
- **Command Line Analysis**: Scans for suspicious command line arguments
- **Temporary Directory Detection**: Identifies processes running from temp directories

### 5. Automated Threat Intelligence Updater
- **Location**: `src/analyzers/threat_intel_updater.py`
- **Features**:
  - Multiple threat intelligence sources
  - Automatic updates every hour
  - Backup and rollback capabilities
  - Update statistics and logging

## Installation Steps

### Step 1: Install Dependencies
```bash
cd bigyellowjacket/server
pip install -r requirements.txt
```

### Step 2: Update Main Application
Add the threat intelligence updater to your main application:

```python
# In src/core/monitor.py or run.py
from src.analyzers.threat_intel_updater import ThreatIntelligenceUpdater

# In your main application initialization
async def main():
    # ... existing initialization ...
    
    # Initialize threat intelligence updater
    threat_updater = ThreatIntelligenceUpdater(update_interval=3600)  # 1 hour
    
    # Start threat intelligence updater
    updater_task = asyncio.create_task(threat_updater.start_updater())
    
    # ... rest of your application ...
    
    # Handle shutdown
    def signal_handler(sig, frame):
        threat_updater.stop_updater()
        # ... existing shutdown code ...
```

### Step 3: Configure Threat Intelligence Sources
The threat intelligence updater uses these sources by default:
- Emerging Threats Compromised IPs
- Spamhaus DROP List
- Abuse.ch SSL Blacklist
- Malware Domain List

You can customize sources by modifying the `threat_sources` dictionary in `ThreatIntelligenceUpdater`.

### Step 4: Test the Enhanced Features

#### Test IP Geolocation
```python
# Test script
import asyncio
from src.analyzers.intelligence import NetworkIntelligenceGatherer

async def test_geolocation():
    gatherer = NetworkIntelligenceGatherer(None)
    result = await gatherer.get_location_info("8.8.8.8")
    print(f"Location info: {result}")

asyncio.run(test_geolocation())
```

#### Test Threat Detection
```python
# Test threat pattern detection
from src.analyzers.intelligence import NetworkIntelligenceGatherer
from src.models.datatypes import NetworkEndpoint

async def test_threat_detection():
    gatherer = NetworkIntelligenceGatherer(None)
    
    # Create test endpoint
    endpoint = NetworkEndpoint(
        host="suspicious.example.com",
        port=1337,
        protocol="TCP"
    )
    
    threats = await gatherer.detect_advanced_threats(endpoint)
    print(f"Detected threats: {threats}")

asyncio.run(test_threat_detection())
```

### Step 5: Update Frontend (Optional)
If you want to display the enhanced threat intelligence in the frontend:

1. Update the WebSocket message handling to include new threat data
2. Add new UI components for threat visualization
3. Display geolocation information on the network map
4. Show threat indicators and risk assessments

## Configuration Options

### Threat Intelligence Update Interval
```python
# Default: 3600 seconds (1 hour)
threat_updater = ThreatIntelligenceUpdater(update_interval=7200)  # 2 hours
```

### Geolocation Service Configuration
```python
# In intelligence.py, you can modify the services list
services = [
    {
        'url': f'http://ip-api.com/json/{host}',
        'parser': self.parse_ip_api_response
    },
    # Add more services as needed
]
```

### Threat Detection Thresholds
```python
# In intelligence.py, you can adjust detection thresholds
# DGA detection entropy threshold
if entropy > 3.5:  # Adjust this value

# C2 detection thresholds
if 50 < avg_size < 500:  # Adjust payload size thresholds
```

## Monitoring and Maintenance

### View Update Statistics
```python
# Check threat intelligence update status
updater_status = threat_updater.get_update_status()
print(f"Update status: {updater_status}")
```

### Force Manual Update
```python
# Force an immediate update
await threat_updater.force_update()
```

### Check Database Size
```bash
# Check threat intelligence database size
ls -la data/threat_intel/
wc -l data/threat_intel/malicious_ips.txt
```

### Monitor Logs
```bash
# Monitor threat intelligence logs
tail -f logs/bigyellowjacket.log | grep -i "threat"
```

## Security Considerations

1. **Rate Limiting**: The geolocation services have rate limits. Consider implementing request throttling for high-volume deployments.

2. **Privacy**: IP geolocation queries are sent to external services. Consider privacy implications and local compliance requirements.

3. **False Positives**: The threat detection algorithms may generate false positives. Monitor and tune detection thresholds accordingly.

4. **External Dependencies**: The system now depends on external threat intelligence sources. Ensure network connectivity and consider failover mechanisms.

## Troubleshooting

### Common Issues

#### Geolocation Service Failures
```python
# Check if geolocation services are reachable
import aiohttp
async with aiohttp.ClientSession() as session:
    async with session.get('http://ip-api.com/json/8.8.8.8') as resp:
        print(f"Status: {resp.status}")
```

#### Threat Intelligence Update Failures
```python
# Check threat intelligence update logs
cat data/threat_intel/update_stats.json
```

#### High Memory Usage
```python
# Monitor cache sizes
print(f"DNS cache size: {len(gatherer.dns_cache)}")
print(f"Location cache size: {len(gatherer.location_cache)}")
```

## Performance Optimization

### Caching
- DNS queries are cached for 1 hour
- Location queries are cached indefinitely
- Process information is cached until process exits

### Parallel Processing
- All intelligence gathering tasks run concurrently
- Threat intelligence updates from multiple sources simultaneously
- Port scanning uses concurrent connections

### Resource Management
- Automatic cache cleanup prevents memory leaks
- Expired entries are removed regularly
- Database backups are maintained automatically

## Next Steps

1. **Install Dependencies**: Run `pip install -r requirements.txt`
2. **Integrate Updater**: Add the threat intelligence updater to your main application
3. **Test Features**: Run the test scripts to verify functionality
4. **Monitor Performance**: Watch logs and system resources
5. **Customize Configuration**: Adjust thresholds and sources as needed

## Support

For issues or questions about the enhanced intelligence features:
1. Check the application logs in `logs/bigyellowjacket.log`
2. Review the threat intelligence update statistics
3. Verify external service connectivity
4. Check system resource usage

The enhanced intelligence system provides significantly improved threat detection capabilities while maintaining backward compatibility with the existing Big Yellow Jacket monitoring system. 