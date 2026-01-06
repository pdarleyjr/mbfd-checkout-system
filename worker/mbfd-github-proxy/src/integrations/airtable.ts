/**
 * Airtable Integration Module for USAR Vehicle Database
 * Provides CRUD operations for vehicle records
 */

interface AirtableConfig {
  apiToken: string;
  baseId: string;
  tableName: string;
}

interface VehicleRecord {
  id?: string;
  regUnit: string;
  vehicleMake: string;
  vehicleType: string;
  features: string;
  agency: string;
  licenseNumber: string;
  vehicleId: string;
  incidentId?: string;
  vehicleStatus: 'Active' | 'Inactive' | 'Maintenance' | 'Deployed';
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  inspectionFrequencyDays?: number;
  notes?: string;
}

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export class AirtableClient {
  private config: AirtableConfig;
  private baseUrl = 'https://api.airtable.com/v0';
  private requestQueue: Promise<any>[] = [];
  private readonly MAX_REQUESTS_PER_SECOND = 5;
  
  constructor(config: AirtableConfig) {
    this.config = config;
  }
  
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json'
    };
  }
  
  private getTableUrl(): string {
    return `${this.baseUrl}/${this.config.baseId}/${encodeURIComponent(this.config.tableName)}`;
  }

  /**
   * Rate limiting: Ensures no more than 5 requests per second
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    this.requestQueue = this.requestQueue.filter(p => p !== null);
    
    if (this.requestQueue.length >= this.MAX_REQUESTS_PER_SECOND) {
      await Promise.race(this.requestQueue);
    }
    
    const promise = new Promise(resolve => setTimeout(resolve, 200));
    this.requestQueue.push(promise);
  }

  /**
   * Fetch all vehicles from Airtable with pagination support
   */
  async fetchVehicles(filterByFormula?: string): Promise<VehicleRecord[]> {
    try {
      await this.rateLimit();
      
      const allRecords: AirtableRecord[] = [];
      let offset: string | undefined;
      
      do {
        const url = new URL(this.getTableUrl());
        if (filterByFormula) {
          url.searchParams.append('filterByFormula', filterByFormula);
        }
        if (offset) {
          url.searchParams.append('offset', offset);
        }
        
        const response = await fetch(url.toString(), {
          headers: this.getHeaders()
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Airtable API error (${response.status}): ${errorText}`);
        }
        
        const data: AirtableResponse = await response.json();
        allRecords.push(...data.records);
        offset = data.offset;
        
      } while (offset);
      
      return allRecords.map(record => this.mapAirtableToVehicle(record));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  /**
   * Get a single vehicle by Airtable record ID
   */
  async getVehicleById(recordId: string): Promise<VehicleRecord | null> {
    try {
      await this.rateLimit();
      
      const response = await fetch(`${this.getTableUrl()}/${recordId}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        const errorText = await response.text();
        throw new Error(`Airtable API error (${response.status}): ${errorText}`);
      }
      
      const data: AirtableRecord = await response.json();
      return this.mapAirtableToVehicle(data);
    } catch (error) {
      console.error(`Error fetching vehicle ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Search vehicles by registration/unit identifier
   */
  async searchByRegUnit(regUnit: string): Promise<VehicleRecord[]> {
    const formula = `SEARCH(LOWER("${regUnit.toLowerCase()}"), LOWER({Reg/Unit}))`;
    return this.fetchVehicles(formula);
  }

  /**
   * Get vehicles by status
   */
  async getVehiclesByStatus(status: VehicleRecord['vehicleStatus']): Promise<VehicleRecord[]> {
    const formula = `{Vehicle Status} = "${status}"`;
    return this.fetchVehicles(formula);
  }

  /**
   * Update an existing vehicle record
   */
  async updateVehicle(recordId: string, updates: Partial<VehicleRecord>): Promise<VehicleRecord> {
    try {
      await this.rateLimit();
      
      const fields = this.mapVehicleToAirtable(updates);
      
      const response = await fetch(`${this.getTableUrl()}/${recordId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ fields })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error (${response.status}): ${errorText}`);
      }
      
      const data: AirtableRecord = await response.json();
      return this.mapAirtableToVehicle(data);
    } catch (error) {
      console.error(`Error updating vehicle ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new vehicle record
   */
  async createVehicle(vehicle: Omit<VehicleRecord, 'id'>): Promise<VehicleRecord> {
    try {
      await this.rateLimit();
      
      const fields = this.mapVehicleToAirtable(vehicle);
      
      const response = await fetch(this.getTableUrl(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ fields })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error (${response.status}): ${errorText}`);
      }
      
      const data: AirtableRecord = await response.json();
      return this.mapAirtableToVehicle(data);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  /**
   * Batch create multiple vehicles (max 10 per request)
   */
  async createVehiclesBatch(vehicles: Omit<VehicleRecord, 'id'>[]): Promise<VehicleRecord[]> {
    const BATCH_SIZE = 10;
    const results: VehicleRecord[] = [];
    
    for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
      const batch = vehicles.slice(i, i + BATCH_SIZE);
      await this.rateLimit();
      
      try {
        const records = batch.map(vehicle => ({
          fields: this.mapVehicleToAirtable(vehicle)
        }));
        
        const response = await fetch(this.getTableUrl(), {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ records })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Airtable API error (${response.status}): ${errorText}`);
        }
        
        const data: AirtableResponse = await response.json();
        results.push(...data.records.map(record => this.mapAirtableToVehicle(record)));
      } catch (error) {
        console.error(`Error creating batch ${i / BATCH_SIZE + 1}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Delete a vehicle record
   */
  async deleteVehicle(recordId: string): Promise<boolean> {
    try {
      await this.rateLimit();
      
      const response = await fetch(`${this.getTableUrl()}/${recordId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error (${response.status}): ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting vehicle ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Map Airtable record to VehicleRecord interface
   */
  private mapAirtableToVehicle(record: AirtableRecord): VehicleRecord {
    const fields = record.fields;
    return {
      id: record.id,
      regUnit: fields['Reg/Unit'] || '',
      vehicleMake: fields['Vehicle Make'] || fields['Vehicle or Equipment Make'] || '',
      vehicleType: fields['Vehicle Type'] || fields['Type (Eng., Bus., Sedan)'] || '',
      features: fields['Features'] || fields['Vehicle or Equipment Features'] || '',
      agency: fields['Agency'] || '',
      licenseNumber: fields['License Number'] || fields['Vehicle License No.'] || '',
      vehicleId: fields['Vehicle ID'] || fields['Veh. ID No.'] || '',
      incidentId: fields['Incident ID'] || fields['Incident ID No.'] || '',
      vehicleStatus: fields['Vehicle Status'] || 'Active',
      lastInspectionDate: fields['Last Inspection Date'],
      nextInspectionDue: fields['Next Inspection Due'],
      inspectionFrequencyDays: fields['Inspection Frequency (Days)'],
      notes: fields['Notes']
    };
  }

  /**
   * Map VehicleRecord to Airtable fields format
   */
  private mapVehicleToAirtable(vehicle: Partial<VehicleRecord>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    if (vehicle.regUnit !== undefined) fields['Reg/Unit'] = vehicle.regUnit;
    if (vehicle.vehicleMake !== undefined) fields['Vehicle Make'] = vehicle.vehicleMake;
    if (vehicle.vehicleType !== undefined) fields['Vehicle Type'] = vehicle.vehicleType;
    if (vehicle.features !== undefined) fields['Features'] = vehicle.features;
    if (vehicle.agency !== undefined) fields['Agency'] = vehicle.agency;
    if (vehicle.licenseNumber !== undefined) fields['License Number'] = vehicle.licenseNumber;
    if (vehicle.vehicleId !== undefined) fields['Vehicle ID'] = vehicle.vehicleId;
    if (vehicle.incidentId !== undefined) fields['Incident ID'] = vehicle.incidentId;
    if (vehicle.vehicleStatus !== undefined) fields['Vehicle Status'] = vehicle.vehicleStatus;
    if (vehicle.lastInspectionDate !== undefined) fields['Last Inspection Date'] = vehicle.lastInspectionDate;
    if (vehicle.nextInspectionDue !== undefined) fields['Next Inspection Due'] = vehicle.nextInspectionDue;
    if (vehicle.inspectionFrequencyDays !== undefined) fields['Inspection Frequency (Days)'] = vehicle.inspectionFrequencyDays;
    if (vehicle.notes !== undefined) fields['Notes'] = vehicle.notes;
    
    return fields;
  }
}

/**
 * Export factory function for Cloudflare Worker environment
 */
export function createAirtableClient(env: any): AirtableClient {
  return new AirtableClient({
    apiToken: env.AIRTABLE_API_TOKEN,
    baseId: env.AIRTABLE_BASE_ID,
    tableName: env.AIRTABLE_TABLE_NAME || 'Vehicles'
  });
}

/**
 * Export types for use in other modules
 */
export type { VehicleRecord, AirtableConfig };
