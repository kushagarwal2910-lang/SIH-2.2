/**
 * SensorRegistry: Extensible plugin architecture for marine observing networks.
 * Supports Argo Floats, Gliders, OMNI/RAMA Moorings, CTD hydrographic casts, and HF-Radar.
 */
export class SensorRegistry {
  constructor() {
    this.types = new Map();
    this.instruments = [];
    this.listeners = [];

    // Register built-in sensor schemas
    this.registerType('ARGO', {
      name: 'Argo Profiling Float',
      color: 0xf59e0b, // Amber
      icon: '🟡',
      description: 'Autonomous battery-powered profiling float parking at 1000m and profiling 0-2000m every 10 days.',
      variables: ['temp', 'salt', 'pressure'],
    });

    this.registerType('GLIDER', {
      name: 'Ocean Underwater Glider',
      color: 0x06b6d4, // Cyan
      icon: '🔵',
      description: 'Autonomous buoyancy-engine vehicle executing continuous sawtooth diving transects.',
      variables: ['temp', 'salt', 'chlorophyll', 'oxygen'],
    });

    this.registerType('MOORING', {
      name: 'OMNI / RAMA Deep-Sea Moored Buoy',
      color: 0xef4444, // Vibrant Red/Coral
      icon: '🔴',
      description: 'Fixed-position deep-sea mooring with surface meteorology and subsurface multi-depth CTD string.',
      variables: ['temp', 'salt', 'oxygen', 'current', 'met'],
    });

    this.registerType('CTD', {
      name: 'Research Vessel Shipboard CTD Rosette',
      color: 0xa855f7, // Purple
      icon: '🟣',
      description: 'Shipboard high-precision Conductivity-Temperature-Depth rosette with 24 Niskin bottles.',
      variables: ['temp', 'salt', 'oxygen', 'ph', 'nitrate'],
    });

    this.registerType('HF_RADAR', {
      name: 'Coastal High-Frequency Radar Station',
      color: 0x10b981, // Emerald green
      icon: '🟢',
      description: 'Shore-based HF radar measuring surface ocean currents and wave vectors up to 200km offshore.',
      variables: ['u_surface', 'v_surface', 'wave_height'],
    });
  }

  /**
   * Register a new sensor plugin type
   */
  registerType(typeKey, typeConfig) {
    this.types.set(typeKey.toUpperCase(), {
      key: typeKey.toUpperCase(),
      ...typeConfig,
    });
  }

  getTypeConfig(typeKey) {
    return this.types.get(typeKey?.toUpperCase()) || {
      name: 'Generic Instrument',
      color: 0x94a3b8,
      icon: '⚪',
      variables: ['temp', 'salt'],
    };
  }

  /**
   * Load instruments into the registry
   */
  load(items = [], typeKey = null) {
    const enriched = items.map((item) => {
      const detectedType = (typeKey || item.instrument_type || 'ARGO').toUpperCase();
      return {
        ...item,
        instrument_type: detectedType,
        typeInfo: this.getTypeConfig(detectedType),
      };
    });

    this.instruments = [...this.instruments, ...enriched];
    this.notify();
    return enriched;
  }

  getAll() {
    return this.instruments;
  }

  getByType(typeKey) {
    return this.instruments.filter((inst) => inst.instrument_type === typeKey.toUpperCase());
  }

  clear() {
    this.instruments = [];
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l(this.instruments));
  }
}
