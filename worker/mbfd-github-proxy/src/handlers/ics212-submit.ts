/**
 * ICS-212 Form Submission Handler
 * 
 * Handles submission of ICS-212 Vehicle Safety Inspection forms:
 * - Validates all required fields
 * - Enforces safety-critical logic (auto-HOLD if safety item fails)
 * - Stores form data in D1 database
 * - Generates official PDF with embedded signatures
 * - Uploads PDF to R2 storage
 * - Creates GitHub Issue with form summary and PDF attachment
 * - Returns submission response with form ID, issue number, and PDF URL
 */

import type { Env } from '../index';
import { generateICS212PDF } from '../pdf/ics212-generator';
import { uploadPDFToR2 } from '../storage/r2-client';

interface InspectionItem {
  itemNumber: number;
  description: string;
  status: 'pass' | 'fail' | 'n/a';
  comments?: string;
  isSafetyItem: boolean;
  reference?: string;
}

interface DigitalSignature {
  imageData: string;
  signedAt: string;
  signedBy: string;
  ipAddress?: string;
  deviceId?: string;
}

interface ICS212SubmissionRequest {
  incidentName: string;
  orderNo?: string;
  vehicleLicenseNo: string;
  agencyRegUnit: string;
  vehicleType: string;
  odometerReading: number;
  vehicleIdNo: string;
  inspectionItems: InspectionItem[];
  additionalComments?: string;
  releaseStatus: 'hold' | 'release';
  inspectorDate: string;
  inspectorTime: string;
  inspectorNamePrint: string;
  inspectorSignature?: DigitalSignature;
  operatorDate?: string;
  operatorTime?: string;
  operatorNamePrint?: string;
  operatorSignature?: DigitalSignature;
  submittedAt?: string;
  status?: string;
}

interface ICS212SubmissionResponse {
  success: boolean;
  formId: string;
  issueNumber?: number;
  releaseDecision: 'hold' | 'release';
  pdfUrl?: string;
  message?: string;
  error?: string;
}

const REPO_OWNER = 'pdarleyjr';
const REPO_NAME = 'mbfd-checkout-system';

export async function handleICS212Submit(
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
    const formData: ICS212SubmissionRequest = await request.json();

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

    // Enforce safety-critical logic
    const releaseDecision = calculateReleaseDecision(formData.inspectionItems);
    if (releaseDecision === 'hold' && formData.releaseStatus !== 'hold') {
      return jsonResponse(
        { 
          success: false, 
          error: 'Safety violation: Form must be marked HOLD when safety items fail',
          releaseDecision 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique form ID
    const formId = generateFormId();

    // Store in D1 database
    const db = env.DB || env.SUPPLY_DB;
    if (!db) {
      console.error('D1 database not configured');
      return jsonResponse(
        { success: false, error: 'Database not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    await storeFormInDatabase(db, formId, formData, releaseDecision);

    // === PHASE 2: PDF GENERATION AND R2 STORAGE ===
    
    let pdfUrl: string | undefined;
    let pdfFilename: string | undefined;
    
    try {
      console.log(`Generating PDF for form ${formId}...`);
      
      // Generate official ICS-212 PDF
      const pdfResult = await generateICS212PDF({
        formData: {
          formId,
          ...formData,
          releaseStatus: releaseDecision as 'hold' | 'release',
        } as any,
        includeSignatures: true,
      });

      console.log(`PDF generated: ${(pdfResult.size / 1024).toFixed(2)} KB`);

      // Upload PDF to R2 storage
      const uploadResult = await uploadPDFToR2(env, {
        filename: pdfResult.filename,
        buffer: pdfResult.buffer,
        metadata: {
          formId,
          vehicleId: formData.vehicleIdNo,
          releaseDecision,
          incidentName: formData.incidentName,
        },
      });

      if (uploadResult.success) {
        pdfUrl = uploadResult.url;
        pdfFilename = pdfResult.filename;
        console.log(`PDF uploaded to R2: ${pdfUrl}`);

        // Update database with PDF info
        await db
          .prepare('UPDATE ics212_forms SET pdf_url = ?, pdf_filename = ? WHERE form_id = ?')
          .bind(pdfUrl, pdfFilename, formId)
          .run();
      } else {
        console.error('PDF upload to R2 failed:', uploadResult.error);
      }
    } catch (pdfError) {
      console.error('PDF generation/upload error:', pdfError);
      // Continue with submission even if PDF fails
    }

    // Create GitHub Issue
    let issueNumber: number | undefined;
    try {
      issueNumber = await createGitHubIssue(env, formId, formData, releaseDecision, pdfUrl);
      
      // Update form with issue number
      await db
        .prepare('UPDATE ics212_forms SET github_issue_number = ? WHERE form_id = ?')
        .bind(issueNumber, formId)
        .run();
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      // Continue anyway - form is saved in database
    }

    const response: ICS212SubmissionResponse = {
      success: true,
      formId,
      issueNumber,
      releaseDecision: releaseDecision as 'hold' | 'release',
      pdfUrl,
      message: 'ICS-212 form submitted successfully',
    };

    return jsonResponse(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('ICS-212 submission error:', error);
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

function validateFormData(data: ICS212SubmissionRequest): string[] {
  const errors: string[] = [];

  if (!data.incidentName || data.incidentName.length < 3) {
    errors.push('Incident name must be at least 3 characters');
  }

  if (!data.vehicleIdNo) {
    errors.push('Vehicle ID is required');
  }

  if (!data.vehicleLicenseNo) {
    errors.push('Vehicle license number is required');
  }

  if (!data.agencyRegUnit) {
    errors.push('Agency Reg/Unit is required');
  }

  if (!data.vehicleType) {
    errors.push('Vehicle type is required');
  }

  if (!data.odometerReading || data.odometerReading === 0) {
    errors.push('Odometer reading is required');
  }

  if (!data.inspectionItems || data.inspectionItems.length !== 17) {
    errors.push('All 17 inspection items must be completed');
  }

  if (!data.inspectorNamePrint || data.inspectorNamePrint.length < 2) {
    errors.push('Inspector name must be at least 2 characters');
  }

  if (!data.inspectorSignature) {
    errors.push('Inspector signature is required');
  }

  if (!data.inspectorDate) {
    errors.push('Inspector date is required');
  }

  if (!data.inspectorTime) {
    errors.push('Inspector time is required');
  }

  return errors;
}

function calculateReleaseDecision(inspectionItems: InspectionItem[]): 'hold' | 'release' {
  const safetyItemsFailed = inspectionItems.some(
    item => item.isSafetyItem && item.status === 'fail'
  );
  return safetyItemsFailed ? 'hold' : 'release';
}

function generateFormId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ICS212-${year}-${sequence}`;
}

async function storeFormInDatabase(
  db: D1Database,
  formId: string,
  data: ICS212SubmissionRequest,
  releaseDecision: string
): Promise<void> {
  // Create table if not exists
  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS ics212_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id TEXT UNIQUE NOT NULL,
        incident_name TEXT NOT NULL,
        order_no TEXT,
        vehicle_license_no TEXT NOT NULL,
        agency_reg_unit TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        odometer_reading INTEGER NOT NULL,
        vehicle_id_no TEXT NOT NULL,
        inspection_items TEXT NOT NULL,
        additional_comments TEXT,
        release_decision TEXT NOT NULL,
        inspector_date TEXT NOT NULL,
        inspector_time TEXT NOT NULL,
        inspector_name_print TEXT NOT NULL,
        inspector_signature TEXT,
        operator_date TEXT,
        operator_time TEXT,
        operator_name_print TEXT,
        operator_signature TEXT,
        pdf_url TEXT,
        pdf_filename TEXT,
        github_issue_number INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .run();

  // Insert form data
  await db
    .prepare(`
      INSERT INTO ics212_forms (
        form_id, incident_name, order_no, vehicle_license_no, agency_reg_unit,
        vehicle_type, odometer_reading, vehicle_id_no, inspection_items,
        additional_comments, release_decision, inspector_date, inspector_time,
        inspector_name_print, inspector_signature, operator_date, operator_time,
        operator_name_print, operator_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      formId,
      data.incidentName,
      data.orderNo || null,
      data.vehicleLicenseNo,
      data.agencyRegUnit,
      data.vehicleType,
      data.odometerReading,
      data.vehicleIdNo,
      JSON.stringify(data.inspectionItems),
      data.additionalComments || null,
      releaseDecision,
      data.inspectorDate,
      data.inspectorTime,
      data.inspectorNamePrint,
      JSON.stringify(data.inspectorSignature),
      data.operatorDate || null,
      data.operatorTime || null,
      data.operatorNamePrint || null,
      data.operatorSignature ? JSON.stringify(data.operatorSignature) : null
    )
    .run();
}

async function createGitHubIssue(
  env: Env,
  formId: string,
  data: ICS212SubmissionRequest,
  releaseDecision: string,
  pdfUrl?: string
): Promise<number> {
  const passCount = data.inspectionItems.filter(item => item.status === 'pass').length;
  const failCount = data.inspectionItems.filter(item => item.status === 'fail').length;
  const naCount = data.inspectionItems.filter(item => item.status === 'n/a').length;

  const title = `ICS-212: ${data.vehicleIdNo} - ${releaseDecision === 'hold' ? '🔴 HOLD' : '🟢 RELEASED'}`;

  const issueBody = `
# ICS-212 Vehicle Safety Inspection

**Form ID**: \`${formId}\`  
**Release Decision**: **${releaseDecision === 'hold' ? '🔴 HOLD FOR REPAIRS' : '🟢 RELEASED'}**

${pdfUrl ? `\n📄 **[Download Official PDF](${pdfUrl})**\n` : ''}

## Incident Information
- **Incident Name**: ${data.incidentName}
- **Date/Time**: ${data.inspectorDate} ${data.inspectorTime}
${data.orderNo ? `- **Order No**: ${data.orderNo}` : ''}

## Vehicle Information
- **Vehicle ID**: ${data.vehicleIdNo}
- **License Plate**: ${data.vehicleLicenseNo}
- **Agency Unit**: ${data.agencyRegUnit}
- **Type**: ${data.vehicleType}
- **Odometer**: ${data.odometerReading.toLocaleString()} miles

## Inspection Results

**Summary**: ${passCount} Pass | ${failCount} Fail | ${naCount} N/A

### Detailed Results

${data.inspectionItems.map(item => 
  `${item.itemNumber}. ${item.description}: **${item.status.toUpperCase()}** ${item.isSafetyItem ? '⚠️' : ''}`
).join('\n')}

${data.additionalComments ? `\n## Additional Comments\n\n${data.additionalComments}\n` : ''}

## Signatures
- **Inspector**: ${data.inspectorNamePrint} (${data.inspectorDate} ${data.inspectorTime})
${data.operatorNamePrint ? `- **Operator**: ${data.operatorNamePrint} (${data.operatorDate} ${data.operatorTime})` : ''}

---
*Submitted via USAR ICS-212 System*
`;

  const labels = [
    'ICS-212',
    'Vehicle Inspection',
    releaseDecision === 'hold' ? 'Safety Hold' : 'Released'
  ];

  const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;

  const response = await fetch(githubUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'USAR-ICS212-System',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body: issueBody,
      labels,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${errorText}`);
  }

  const issue = await response.json();
  return (issue as any).number;
}

function jsonResponse(data: any, options: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
