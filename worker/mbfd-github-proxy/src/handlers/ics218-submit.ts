/**
 * ICS-218 Form Submission Handler
 * 
 * Handles comprehensive submission of ICS-218 Support Vehicle/Equipment Inventory forms:
 * - Validates all required fields and vehicle data
 * - Stores form and vehicles in D1 database
 * - Generates professional PDF with vehicle table
 * - Uploads PDF to R2 storage
 * - Creates GitHub Issue with form summary
 * - Returns submission response with form ID, issue number, and PDF URL
 */

import type { Env } from '../index';
import { generateICS218PDF } from '../pdf/ics218-generator';
import { uploadPDFToR2 } from '../storage/r2-client';
import { createICS218GitHubIssue } from '../integrations/github-ics218';

interface ICS218Vehicle {
  orderRequestNumber?: string;
  incidentIdNo?: string;
  classification: string;
  make: string;
  categoryKindType: string;
  features?: string;
  agencyOwner: string;
  operatorNameContact: string;
  vehicleLicenseId: string;
  incidentAssignment: string;
  startDateTime: string;
  releaseDateTime?: string;
  airtableId?: string;
}

interface ICS218SubmissionRequest {
  incidentName: string;
  incidentNumber: string;
  datePrepared: string;
  timePrepared: string;
  vehicleCategory: string;
  vehicles: ICS218Vehicle[];
  preparedBy: {
    name: string;
    positionTitle: string;
    signature: string; // Base64 data URL
    signatureTimestamp: string; // ISO 8601
  };
  submittedAt?: string;
  submittedBy?: string;
}

interface ICS218SubmissionResponse {
  success: boolean;
  formId: string;
  issueNumber?: number;
  pdfUrl?: string;
  vehicleCount: number;
  message?: string;
  error?: string;
}

export async function handleICS218Submit(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const formData: ICS218SubmissionRequest = await request.json();

    // Validate all required fields
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      return jsonResponse(
        { 
          success: false, 
          error: 'Validation failed', 
          errors: validationErrors 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique form ID
    const formId = generateFormId();

    // Prepare timestamps
    const submittedAt = formData.submittedAt || new Date().toISOString();
    const submittedBy = formData.submittedBy || 'system';

    // === PHASE 1: STORE IN D1 DATABASE ===
    
    const db = env.DB || env.SUPPLY_DB;
    if (!db) {
      console.error('D1 database not configured');
      return jsonResponse(
        { success: false, error: 'Database not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    await storeFormInDatabase(db, formId, formData, submittedAt, submittedBy);

    // === PHASE 2: PDF GENERATION AND R2 STORAGE ===
    
    let pdfUrl: string | undefined;
    let pdfFilename: string | undefined;
    
    try {
      console.log(`Generating ICS-218 PDF for form ${formId}...`);
      
      // Generate official ICS-218 PDF
      const pdfResult = await generateICS218PDF({
        formData: {
          id: formId,
          ...formData,
          submittedAt,
          submittedBy,
        },
        includeSignatures: true,
      });

      console.log(`PDF generated: ${(pdfResult.size / 1024).toFixed(2)} KB`);

      // Upload PDF to R2 storage with ICS 218 path structure
      const now = new Date(formData.datePrepared);
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const r2Filename = `ics218/${year}/${month}/${formId}.pdf`;

      const uploadResult = await uploadPDFToR2(env, {
        filename: r2Filename,
        buffer: pdfResult.buffer,
        metadata: {
          formId,
          formType: 'ICS-218',
          incidentName: formData.incidentName,
          vehicleCategory: formData.vehicleCategory,
          vehicleCount: formData.vehicles.length.toString(),
        },
      });

      if (uploadResult.success) {
        pdfUrl = uploadResult.url;
        pdfFilename = r2Filename;
        console.log(`PDF uploaded to R2: ${pdfUrl}`);

        // Update database with PDF info
        await db
          .prepare('UPDATE ics218_forms SET pdf_url = ?, pdf_filename = ? WHERE id = ?')
          .bind(pdfUrl, pdfFilename, formId)
          .run();
      } else {
        console.error('PDF upload to R2 failed:', uploadResult.error);
      }
    } catch (pdfError) {
      console.error('PDF generation/upload error:', pdfError);
      // Continue with submission even if PDF fails
    }

    // === PHASE 3: CREATE GITHUB ISSUE ===
    
    let issueNumber: number | undefined;
    try {
      issueNumber = await createICS218GitHubIssue(
        env,
        {
          id: formId,
          ...formData,
          submittedAt,
          submittedBy,
        },
        pdfUrl
      );
      
      // Update form with issue number
      await db
        .prepare('UPDATE ics218_forms SET github_issue_number = ? WHERE id = ?')
        .bind(issueNumber, formId)
        .run();
        
      console.log(`Created GitHub issue #${issueNumber} for ICS-218 form ${formId}`);
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      // Continue anyway - form is saved in database
    }

    const response: ICS218SubmissionResponse = {
      success: true,
      formId,
      issueNumber,
      pdfUrl,
      vehicleCount: formData.vehicles.length,
      message: 'ICS-218 form submitted successfully',
    };

    return jsonResponse(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('ICS-218 submission error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Validate ICS-218 form data
 */
function validateFormData(data: ICS218SubmissionRequest): string[] {
  const errors: string[] = [];

  // Header fields
  if (!data.incidentName || data.incidentName.length < 3) {
    errors.push('Incident name must be at least 3 characters');
  }

  if (!data.incidentNumber) {
    errors.push('Incident number is required');
  }

  if (!data.datePrepared) {
    errors.push('Date prepared is required');
  }

  if (!data.timePrepared) {
    errors.push('Time prepared is required');
  }

  if (!data.vehicleCategory) {
    errors.push('Vehicle category is required');
  }

  // Vehicles validation
  if (!data.vehicles || data.vehicles.length === 0) {
    errors.push('At least one vehicle is required');
  }

  if (data.vehicles && data.vehicles.length > 100) {
    errors.push('Maximum 100 vehicles allowed per form');
  }

  // Validate each vehicle
  data.vehicles?.forEach((vehicle, idx) => {
    if (!vehicle.classification) {
      errors.push(`Vehicle ${idx + 1}: Classification is required`);
    }
    if (!vehicle.make) {
      errors.push(`Vehicle ${idx + 1}: Make is required`);
    }
    if (!vehicle.categoryKindType) {
      errors.push(`Vehicle ${idx + 1}: Category/Kind/Type is required`);
    }
    if (!vehicle.agencyOwner) {
      errors.push(`Vehicle ${idx + 1}: Agency/Owner is required`);
    }
    if (!vehicle.operatorNameContact) {
      errors.push(`Vehicle ${idx + 1}: Operator name/contact is required`);
    }
    if (!vehicle.vehicleLicenseId) {
      errors.push(`Vehicle ${idx + 1}: License/ID is required`);
    }
    if (!vehicle.incidentAssignment) {
      errors.push(`Vehicle ${idx + 1}: Incident assignment is required`);
    }
    if (!vehicle.startDateTime) {
      errors.push(`Vehicle ${idx + 1}: Start date/time is required`);
    }
  });

  // Prepared by validation
  if (!data.preparedBy || !data.preparedBy.name || data.preparedBy.name.length < 2) {
    errors.push('Prepared by name must be at least 2 characters');
  }

  if (!data.preparedBy || !data.preparedBy.positionTitle) {
    errors.push('Prepared by position/title is required');
  }

  if (!data.preparedBy || !data.preparedBy.signature) {
    errors.push('Signature is required');
  }

  return errors;
}

/**
 * Generate unique form ID
 */
function generateFormId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ICS218-${year}-${sequence}`;
}

/**
 * Store form and vehicles in D1 database
 */
async function storeFormInDatabase(
  db: D1Database,
  formId: string,
  data: ICS218SubmissionRequest,
  submittedAt: string,
  submittedBy: string
): Promise<void> {
  // Insert form record
  await db
    .prepare(`
      INSERT INTO ics218_forms (
        id, incident_name, incident_number, date_prepared, time_prepared,
        vehicle_category, prepared_by_name, prepared_by_position, signature_data,
        signature_timestamp, submitted_at, submitted_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      formId,
      data.incidentName,
      data.incidentNumber,
      data.datePrepared,
      data.timePrepared,
      data.vehicleCategory,
      data.preparedBy.name,
      data.preparedBy.positionTitle,
      data.preparedBy.signature,
      data.preparedBy.signatureTimestamp,
      submittedAt,
      submittedBy
    )
    .run();

  // Insert vehicle records
  for (let i = 0; i < data.vehicles.length; i++) {
    const vehicle = data.vehicles[i];
    const vehicleId = `${formId}-V${(i + 1).toString().padStart(3, '0')}`;
    
    await db
      .prepare(`
        INSERT INTO ics218_vehicles (
          id, form_id, order_request_number, incident_id_no, classification,
          make, category_kind_type, features, agency_owner, operator_name_contact,
          vehicle_license_id, incident_assignment, start_date_time, release_date_time,
          airtable_id, row_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        vehicleId,
        formId,
        vehicle.orderRequestNumber || null,
        vehicle.incidentIdNo || null,
        vehicle.classification,
        vehicle.make,
        vehicle.categoryKindType,
        vehicle.features || null,
        vehicle.agencyOwner,
        vehicle.operatorNameContact,
        vehicle.vehicleLicenseId,
        vehicle.incidentAssignment,
        vehicle.startDateTime,
        vehicle.releaseDateTime || null,
        vehicle.airtableId || null,
        i + 1
      )
      .run();
  }

  console.log(`Stored ICS-218 form ${formId} with ${data.vehicles.length} vehicles in database`);
}

/**
 * Helper function to create JSON responses
 */
function jsonResponse(
  data: any,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
