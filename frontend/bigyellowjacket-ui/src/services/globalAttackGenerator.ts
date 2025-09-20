import { AttackEvent, MacAddress, MacAddressUtils, WiFiAccessPoint, WiFiLocationData, LocationDetails } from '../models/datatypes';

class GlobalAttackGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private listeners: Set<(attack: AttackEvent) => void> = new Set();
  private readonly STORAGE_KEY = 'BYJ_PERSISTENT_ATTACKS';
  private readonly MAX_STORED_ATTACKS = 10000; // Large limit for persistence

  constructor() {
    this.loadPersistedAttacks();
  }

  private loadPersistedAttacks() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const attacks = JSON.parse(stored);
        const anyWindow = window as any;
        anyWindow.BYJ_DEMO_POINTS = attacks;
        console.log('📦 Loaded persisted attacks:', attacks.length);
      }
    } catch (error) {
      console.error('❌ Failed to load persisted attacks:', error);
    }
  }

  private saveAttacks(attacks: AttackEvent[]) {
    try {
      // Keep only the most recent attacks to avoid localStorage bloat
      const toStore = attacks.slice(0, this.MAX_STORED_ATTACKS);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('❌ Failed to save attacks to localStorage:', error);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting global attack generator with persistence');
    
    this.intervalId = setInterval(() => {
      const newAttack = this.generateAttackEvent();
      
      // Update global window object for map access
      const anyWindow = window as any;
      if (!anyWindow.BYJ_DEMO_POINTS) {
        anyWindow.BYJ_DEMO_POINTS = [];
      }
      
      // Add new attack to the beginning (most recent first)
      anyWindow.BYJ_DEMO_POINTS = [newAttack, ...anyWindow.BYJ_DEMO_POINTS];
      
      // Save to localStorage for persistence
      this.saveAttacks(anyWindow.BYJ_DEMO_POINTS);
      
      // Notify all listeners
      this.listeners.forEach(listener => listener(newAttack));
      
      console.log('🔄 Generated new attack, total stored:', anyWindow.BYJ_DEMO_POINTS.length);
    }, Math.random() * 3000 + 1000); // Random interval between 1-4 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped global attack generator');
  }

  addListener(listener: (attack: AttackEvent) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (attack: AttackEvent) => void) {
    this.listeners.delete(listener);
  }

  getAllAttacks(): AttackEvent[] {
    const anyWindow = window as any;
    return anyWindow.BYJ_DEMO_POINTS || [];
  }

  clearAllAttacks() {
    const anyWindow = window as any;
    anyWindow.BYJ_DEMO_POINTS = [];
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Cleared all attacks from storage');
  }

  getAttackCount(): number {
    return this.getAllAttacks().length;
  }

  private generateAttackEvent(): AttackEvent {
    const attackTypes = [
      'SQL Injection', 'XSS Attack', 'DDoS', 'Brute Force', 'Port Scan',
      'Malware Download', 'Phishing Attempt', 'Ransomware', 'Botnet Activity',
      'Credential Stuffing', 'Zero-day Exploit', 'Man-in-the-Middle'
    ];
    
    const countries = [
      'United States', 'China', 'Russia', 'Germany', 'United Kingdom',
      'Japan', 'Brazil', 'India', 'France', 'Canada', 'Australia', 'Netherlands'
    ];
    
    const cities = [
      'New York', 'Beijing', 'Moscow', 'Berlin', 'London', 'Tokyo',
      'São Paulo', 'Mumbai', 'Paris', 'Toronto', 'Sydney', 'Amsterdam'
    ];
    
    const cityToLatLon: Record<string, { lat: number; lon: number }> = {
      'New York': { lat: 40.7128, lon: -74.0060 },
      'Beijing': { lat: 39.9042, lon: 116.4074 },
      'Moscow': { lat: 55.7558, lon: 37.6173 },
      'Berlin': { lat: 52.5200, lon: 13.4050 },
      'London': { lat: 51.5074, lon: -0.1278 },
      'Tokyo': { lat: 35.6762, lon: 139.6503 },
      'São Paulo': { lat: -23.5505, lon: -46.6333 },
      'Mumbai': { lat: 19.0760, lon: 72.8777 },
      'Paris': { lat: 48.8566, lon: 2.3522 },
      'Toronto': { lat: 43.6532, lon: -79.3832 },
      'Sydney': { lat: -33.8688, lon: 151.2093 },
      'Amsterdam': { lat: 52.3676, lon: 4.9041 },
    };
    
    const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'SMTP'];
    const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['high', 'critical'];
    const statuses: ('blocked' | 'allowed' | 'monitoring')[] = ['blocked', 'allowed', 'monitoring'];
    
    // Generate realistic MAC addresses
    const generateMacAddress = (): MacAddress => {
      const oui = ['00:50:56', '08:00:27', '00:0C:29', '00:1C:42', '52:54:00', '00:15:5D', '00:16:3E', 'AC:DE:48'];
      const randomOui = oui[Math.floor(Math.random() * oui.length)];
      const randomBytes = Array.from({length: 3}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');
      return MacAddressUtils.create(`${randomOui}:${randomBytes}`);
    };
    
    const now = new Date();
    const randomIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const base = cityToLatLon[city] || { lat: 37.7749, lon: -122.4194 };
    // Add a tiny jitter so markers in same city don't overlap
    const jitter = () => (Math.random() - 0.5) * 0.2; // ~0.2 degrees
    
    // 20% chance of creating a spoofed attack for demo purposes
    const isSpoofed = Math.random() < 0.2;
    const actualCountry = isSpoofed ? countries[Math.floor(Math.random() * countries.length)] : country;

    const macAddress = generateMacAddress();
    
    // Generate WiFi location data
    const wifiLocation = this.generateWiFiLocationData(base.lat + jitter(), base.lon + jitter(), city);
    const locationDetails = this.generateLocationDetails(base.lat + jitter(), base.lon + jitter(), city, wifiLocation);

    const attack: AttackEvent = {
      id: `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: randomIP,
      mac: macAddress,
      port: Math.floor(Math.random() * 65535) + 1,
      protocol: protocols[Math.floor(Math.random() * protocols.length)] as any,
      attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      timestamp: now.toISOString(),
      country,
      city,
      lat: base.lat + jitter(),
      lon: base.lon + jitter(),
      bytesTransferred: Math.floor(Math.random() * 1000000) + 1000,
      duration: Math.floor(Math.random() * 300) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sourcePort: Math.floor(Math.random() * 65535) + 1,
      destinationPort: Math.floor(Math.random() * 65535) + 1,
      packetCount: Math.floor(Math.random() * 1000) + 1,
      isSpoofed,
      actualCountry: isSpoofed ? actualCountry : country,
      riskScore: Math.floor(Math.random() * 100) + 1,
      threatLevel: severities[Math.floor(Math.random() * severities.length)],
      attackVector: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      targetSystem: `system-${Math.floor(Math.random() * 100)}`,
      geoLocation: {
        country,
        city,
        lat: base.lat + jitter(),
        lon: base.lon + jitter(),
        region: 'Unknown',
        timezone: 'UTC'
      },
      // WiFi location tracking
      wifiLocation,
      locationDetails
    };

    return attack;
  }

  private generateWiFiLocationData(lat: number, lon: number, city: string): WiFiLocationData {
    const now = new Date();
    const accessPoints: WiFiAccessPoint[] = [];
    
    // Generate 3-8 WiFi access points for triangulation
    const numAPs = Math.floor(Math.random() * 6) + 3;
    
    const commonSSIDs = [
      'Linksys', 'NETGEAR', 'TP-Link', 'ASUS', 'D-Link', 'Cisco',
      'Xfinity', 'Verizon', 'AT&T', 'Spectrum', 'Cox', 'CenturyLink',
      'Starbucks_WiFi', 'McDonald\'s_Free_WiFi', 'Airport_WiFi',
      'Hotel_Guest', 'Office_WiFi', 'Home_Network', 'Public_WiFi'
    ];
    
    const vendors = ['Cisco', 'Netgear', 'TP-Link', 'Linksys', 'ASUS', 'D-Link', 'Ubiquiti', 'Aruba'];
    const securityTypes = ['WPA2', 'WPA3', 'WEP', 'Open', 'WPA2-Enterprise'];
    
    for (let i = 0; i < numAPs; i++) {
      const ssid = commonSSIDs[Math.floor(Math.random() * commonSSIDs.length)];
      const bssid = this.generateRandomBSSID();
      const signalStrength = -30 - Math.floor(Math.random() * 70); // -30 to -100 dBm
      const frequency = Math.random() > 0.5 ? 2400 + Math.floor(Math.random() * 100) : 5000 + Math.floor(Math.random() * 1000);
      const channel = frequency < 3000 ? Math.floor((frequency - 2400) / 5) : Math.floor((frequency - 5000) / 5);
      
      accessPoints.push({
        ssid,
        bssid,
        signalStrength,
        frequency,
        channel,
        security: securityTypes[Math.floor(Math.random() * securityTypes.length)],
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        isHidden: Math.random() < 0.1, // 10% chance of hidden network
        firstSeen: new Date(now.getTime() - Math.random() * 3600000).toISOString(), // Within last hour
        lastSeen: now.toISOString()
      });
    }
    
    // Sort by signal strength (strongest first)
    accessPoints.sort((a, b) => b.signalStrength - a.signalStrength);
    
    const strongest = accessPoints[0];
    const weakest = accessPoints[accessPoints.length - 1];
    const average = accessPoints.reduce((sum, ap) => sum + ap.signalStrength, 0) / accessPoints.length;
    
    // Generate WiFi fingerprint (hash of nearby APs)
    const fingerprint = this.generateWiFiFingerprint(accessPoints);
    
    return {
      accessPoints,
      estimatedAccuracy: Math.random() * 50 + 5, // 5-55 meters
      locationMethod: 'wifi',
      wifiFingerprint: fingerprint,
      signalMap: {
        strongest,
        weakest,
        average
      },
      triangulation: {
        method: Math.random() > 0.5 ? 'trilateration' : 'fingerprinting',
        confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
        sources: accessPoints.length
      }
    };
  }

  private generateLocationDetails(lat: number, lon: number, city: string, wifiLocation: WiFiLocationData): LocationDetails {
    const now = new Date();
    
    // Generate realistic address based on city
    const streetNumbers = Math.floor(Math.random() * 9999) + 1;
    const streetNames = ['Main St', 'Broadway', 'First Ave', 'Second Ave', 'Park Ave', 'Madison Ave', '5th Ave', 'Lexington Ave'];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const address = `${streetNumbers} ${streetName}, ${city}`;
    
    // Generate building info
    const buildingTypes = ['Office Building', 'Residential Complex', 'Shopping Mall', 'Airport Terminal', 'Hotel', 'University Building', 'Government Building'];
    const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    const buildingNumber = Math.floor(Math.random() * 100) + 1;
    const building = `${buildingType} ${buildingNumber}`;
    
    // Generate floor and room (for indoor locations)
    const isIndoor = Math.random() > 0.3; // 70% chance of indoor
    const floor = isIndoor ? Math.floor(Math.random() * 20) - 2 : null; // -2 to 17 (basement to 17th floor)
    const room = isIndoor && Math.random() > 0.5 ? `Room ${Math.floor(Math.random() * 500) + 100}` : null;
    
    // Generate venue context
    const venues = ['Airport', 'Shopping Mall', 'Office Complex', 'University Campus', 'Hotel', 'Restaurant', 'Public Space', 'Residential Area'];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    
    const environments: ('indoor' | 'outdoor' | 'underground' | 'elevated')[] = ['indoor', 'outdoor', 'underground', 'elevated'];
    const environment = environments[Math.floor(Math.random() * environments.length)];
    
    const densities: ('sparse' | 'moderate' | 'dense')[] = ['sparse', 'moderate', 'dense'];
    const density = densities[Math.floor(Math.random() * densities.length)];
    
    return {
      address,
      building,
      floor,
      room,
      coordinates: {
        lat,
        lon,
        altitude: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : null
      },
      accuracy: {
        horizontal: wifiLocation.estimatedAccuracy,
        vertical: Math.random() > 0.5 ? Math.random() * 10 : null
      },
      context: {
        venue,
        environment,
        density
      },
      tracking: {
        lastUpdate: now.toISOString(),
        updateFrequency: Math.floor(Math.random() * 30) + 5, // 5-35 seconds
        isActive: true,
        confidence: wifiLocation.triangulation.confidence
      }
    };
  }

  private generateRandomBSSID(): string {
    const hex = '0123456789ABCDEF';
    let bssid = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) bssid += ':';
      bssid += hex[Math.floor(Math.random() * 16)];
      bssid += hex[Math.floor(Math.random() * 16)];
    }
    return bssid;
  }

  private generateWiFiFingerprint(accessPoints: WiFiAccessPoint[]): string {
    // Create a unique fingerprint based on nearby access points
    const fingerprint = accessPoints
      .map(ap => `${ap.bssid}:${ap.signalStrength}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}

// Create a singleton instance
export const globalAttackGenerator = new GlobalAttackGenerator();

// Auto-start the generator when the module loads
if (typeof window !== 'undefined') {
  globalAttackGenerator.start();
}
