import * as Location from 'expo-location';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
}

class GPSService {
  private lastKnownLocation: GPSCoordinates | null = null;
  private permissionGranted = false;

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  async getCurrentLocation(): Promise<GPSCoordinates | null> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: GPSCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null,
        altitude: location.coords.altitude ?? null,
        timestamp: location.timestamp,
      };

      this.lastKnownLocation = coords;
      return coords;
    } catch (error) {
      console.error('Error getting GPS location:', error);
      return this.lastKnownLocation;
    }
  }

  getLastKnownLocation(): GPSCoordinates | null {
    return this.lastKnownLocation;
  }

  async watchPosition(
    callback: (coords: GPSCoordinates) => void,
    intervalMs: number = 5000
  ): Promise<Location.LocationSubscription | null> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 10,
        },
        (location) => {
          const coords: GPSCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? null,
            altitude: location.coords.altitude ?? null,
            timestamp: location.timestamp,
          };
          this.lastKnownLocation = coords;
          callback(coords);
        }
      );
      return subscription;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  }

  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }
}

export const gpsService = new GPSService();
