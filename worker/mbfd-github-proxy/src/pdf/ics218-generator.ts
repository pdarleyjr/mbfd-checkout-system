/**
 * ICS-218 Support Vehicle/Equipment Inventory - PDF Generation Module
 *
 * Generates professional ICS-218 PDFs matching official form layout with:
 * - Official government form header
 * - Incident information section
 * - 11-column vehicle/equipment table (supports pagination)
 * - Embedded digital signature
 * - NIMS compliance formatting
 *
 * Target: Professional appearance, <1s generation, <1MB file size
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// PDF Constants - Official ICS-218 Layout Specifications
const PAGE_SIZE = { width: 612, height: 792 }; // 8.5" x 11" @ 72 DPI
const MARGINS = { top: 36, bottom: 36, left: 24, right: 24 }; // Narrower for table
const CONTENT_WIDTH = PAGE_SIZE.width - MARGINS.left - MARGINS.right; // 564pt

// Font Sizes
const FONTS = {
  title: 14,
  subtitle: 11,
  sectionHeader: 10,
  normal: 9,
  small: 8,
  tiny: 6,
};

// Colors (RGB 0-1 scale)
const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.6, 0.6, 0.6),
  veryLightGray: rgb(0.9, 0.9, 0.9),
  boxStroke: rgb(0, 0, 0),
};

// Interfaces
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

interface ICS218FormData {
  id?: string;
  incidentName: string;
  incidentNumber: string;
  datePrepared: string;
  timePrepared: string;
  vehicleCategory: string;
  vehicles: ICS218Vehicle[];
  preparedBy: {
    name: string;
    positionTitle: string;
    signature: string;
    signatureTimestamp: string;
  };
  submittedAt?: string;
  submittedBy?: string;
}

export interface PDFGenerationOptions {
  formData: ICS218FormData;
  includeSignatures: boolean;
  watermark?: string;
}

export interface PDFGenerationResult {
  buffer: ArrayBuffer;
  filename: string;
  size: number;
  generatedAt: string;
}

/**
 * Main PDF Generation Function
 */
export async function generateICS218PDF(
  options: PDFGenerationOptions
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  
  try {
    const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Calculate how many pages we need (12 vehicles per page)
    const vehiclesPerPage = 12;
    const pageCount = Math.ceil(options.formData.vehicles.length / vehiclesPerPage);
    
    for (let pageNum = 0; pageNum < pageCount; pageNum++) {
      const page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
      let currentY = PAGE_SIZE.height - MARGINS.top;
      
      // First page: full header
      if (pageNum === 0) {
        currentY = renderHeader(page, normalFont, boldFont, options.formData, currentY);
        currentY = renderIncidentInfo(page, normalFont, boldFont, options.formData, currentY - 10);
        currentY -= 15;
      } else {
        // Subsequent pages: abbreviated header
        currentY = renderAbbreviatedHeader(page, normalFont, boldFont, options.formData, currentY);
        currentY -= 10;
      }
      
      // Render vehicle table for this page
      const startVehicleIdx = pageNum * vehiclesPerPage;
      const endVehicleIdx = Math.min(startVehicleIdx + vehiclesPerPage, options.formData.vehicles.length);
      const vehiclesOnPage = options.formData.vehicles.slice(startVehicleIdx, endVehicleIdx);
      
      currentY = renderVehicleTable(page, normalFont, boldFont, vehiclesOnPage, startVehicleIdx, currentY);
      
      // Last page: add signature
      if (pageNum === pageCount - 1) {
        currentY = await renderSignature(page, normalFont, boldFont, options.formData, pdfDoc, currentY - 15);
      }
      
      renderFooter(page, normalFont, pageNum + 1, pageCount);
    }
    
    // Watermark if specified
    if (options.watermark) {
      renderWatermark(pdfDoc.getPages()[0], normalFont, options.watermark);
    }
    
    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    const generationTime = Date.now() - startTime;
    console.log(`ICS-218 PDF generated in ${generationTime}ms, size: ${(buffer.byteLength / 1024).toFixed(2)}KB`);
    
    return {
      buffer,
      filename: `ICS218-${options.formData.id || Date.now()}.pdf`,
      size: buffer.byteLength,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('ICS-218 PDF generation failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Section 1: Header - Official ICS-218 Title Block
 */
function renderHeader(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS218FormData,
  startY: number
): number {
  const { width } = page.getSize();
  let y = startY;
  
  // Main title
  const title = 'SUPPORT VEHICLE/EQUIPMENT INVENTORY';
  const titleWidth = boldFont.widthOfTextAtSize(title, FONTS.title);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: y,
    size: FONTS.title,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 16;
  
  // Subtitle: ICS 218
  const subtitle = 'ICS 218';
  const subtitleWidth = boldFont.widthOfTextAtSize(subtitle, FONTS.subtitle);
  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: y,
    size: FONTS.subtitle,
    font: boldFont,
    color: COLORS.black,
  });
  
  // Form ID in top-right
  if (formData.id) {
    const formIdText = `Form ID: ${formData.id}`;
    page.drawText(formIdText, {
      x: width - MARGINS.right - normalFont.widthOfTextAtSize(formIdText, FONTS.small),
      y: startY,
      size: FONTS.small,
      font: normalFont,
      color: COLORS.darkGray,
    });
  }
  
  y -= 10;
  
  // Horizontal separator line
  page.drawLine({
    start: { x: MARGINS.left, y: y },
    end: { x: width - MARGINS.right, y: y },
    thickness: 1,
    color: COLORS.black,
  });
  
  return y - 5;
}

/**
 * Abbreviated header for subsequent pages
 */
function renderAbbreviatedHeader(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS218FormData,
  startY: number
): number {
  let y = startY;
  
  page.drawText('ICS 218 - SUPPORT VEHICLE/EQUIPMENT INVENTORY (continued)', {
    x: MARGINS.left,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(`Incident: ${formData.incidentName}`, {
    x: PAGE_SIZE.width - MARGINS.right - 200,
    y: y,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.darkGray,
  });
  
  y -= 8;
  
  page.drawLine({
    start: { x: MARGINS.left, y: y },
    end: { x: PAGE_SIZE.width - MARGINS.right, y: y },
    thickness: 0.5,
    color: COLORS.darkGray,
  });
  
  return y - 5;
}

/**
 * Section 2: Incident Information Block
 */
function renderIncidentInfo(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS218FormData,
  startY: number
): number {
  let y = startY;
  
  const leftCol = MARGINS.left;
  const rightCol = MARGINS.left + 300;
  
  // Row 1: Incident Name & Number
  page.drawText('1. Incident Name:', {
    x: leftCol,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.incidentName, {
    x: leftCol + 90,
    y: y,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText('2. Incident Number:', {
    x: rightCol,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.incidentNumber, {
    x: rightCol + 100,
    y: y,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  y -= 12;
  
  // Row 2: Date/Time & Category
  page.drawText('3. Date/Time Prepared:', {
    x: leftCol,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(`${new Date(formData.datePrepared).toLocaleDateString()} ${formData.timePrepared}`, {
    x: leftCol + 110,
    y: y,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText('4. Vehicle/Equipment Category:', {
    x: rightCol,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.vehicleCategory, {
    x: rightCol + 150,
    y: y,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  return y - 5;
}

/**
 * Section 3: Vehicle Table - 11 columns
 */
function renderVehicleTable(
  page: any,
  normalFont: any,
  boldFont: any,
  vehicles: ICS218Vehicle[],
  startIdx: number,
  startY: number
): number {
  let y = startY;
  
  // Column widths (total: 564pt)
  const cols = {
    order: 30,        // Order #
    incidentId: 35,   // Incident ID
    class: 50,        // Classification
    make: 45,         // Make
    category: 60,     // Category/Type
    features: 50,     // Features
    agency: 55,       // Agency
    operator: 70,     // Operator
    license: 45,      // License
    assignment: 60,   // Assignment
    start: 64,        // Start Time
  };
  
  // Table header
  page.drawText('5. VEHICLE/EQUIPMENT INFORMATION', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 14;
  
  // Column headers
  const headerY = y;
  const headers = [
    { text: 'Order\nReq #', x: MARGINS.left, width: cols.order },
    { text: 'Incident\nID #', x: MARGINS.left + cols.order, width: cols.incidentId },
    { text: 'Classification', x: MARGINS.left + cols.order + cols.incidentId, width: cols.class },
    { text: 'Make', x: MARGINS.left + cols.order + cols.incidentId + cols.class, width: cols.make },
    { text: 'Category/\nKind/Type', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make, width: cols.category },
    { text: 'Features', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category, width: cols.features },
    { text: 'Agency/\nOwner', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features, width: cols.agency },
    { text: 'Operator\nName', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency, width: cols.operator },
    { text: 'License/\nID #', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator, width: cols.license },
    { text: 'Incident\nAssignment', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + cols.license, width: cols.assignment },
    { text: 'Start\nDate/Time', x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + cols.license + cols.assignment, width: cols.start },
  ];
  
  // Draw header cells with background
  page.drawRectangle({
    x: MARGINS.left,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: COLORS.veryLightGray,
    borderColor: COLORS.black,
    borderWidth: 0.5,
  });
  
  // Draw vertical lines and header text
  let currentX = MARGINS.left;
  headers.forEach((header, idx) => {
    // Vertical line
    if (idx > 0) {
      page.drawLine({
        start: { x: currentX, y: y },
        end: { x: currentX, y: y - 16 },
        thickness: 0.5,
        color: COLORS.black,
      });
    }
    
    // Header text (handle multi-line)
    const lines = header.text.split('\n');
    lines.forEach((line, lineIdx) => {
      page.drawText(line, {
        x: currentX + 2,
        y: y - 6 - (lineIdx * 6),
        size: FONTS.tiny,
        font: boldFont,
        color: COLORS.black,
        maxWidth: header.width - 4,
      });
    });
    
    currentX += header.width;
  });
  
  // Right border
  page.drawLine({
    start: { x: currentX, y: y },
    end: { x: currentX, y: y - 16 },
    thickness: 0.5,
    color: COLORS.black,
  });
  
  y -= 18;
  
  // Render vehicle rows
  const rowHeight = 32;
  vehicles.forEach((vehicle, idx) => {
    // Row background (alternating)
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGINS.left,
        y: y - rowHeight + 2,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }
    
    // Row borders
    page.drawRectangle({
      x: MARGINS.left,
      y: y - rowHeight + 2,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: COLORS.black,
      borderWidth: 0.5,
    });
    
    // Draw vertical lines
    currentX = MARGINS.left;
    headers.forEach((header, colIdx) => {
      if (colIdx > 0) {
        page.drawLine({
          start: { x: currentX, y: y },
          end: { x: currentX, y: y - rowHeight + 2 },
          thickness: 0.5,
          color: COLORS.lightGray,
        });
      }
      currentX += header.width;
    });
    
    // Draw cell data
    const cellY = y - 8;
    const truncate = (text: string, maxWidth: number) => {
      const textWidth = normalFont.widthOfTextAtSize(text, FONTS.tiny);
      if (textWidth <= maxWidth) return text;
      return text.substring(0, Math.floor(text.length * maxWidth / textWidth) - 2) + '..';
    };
    
    // Order Request #
    if (vehicle.orderRequestNumber) {
      page.drawText(truncate(vehicle.orderRequestNumber, cols.order - 4), {
        x: MARGINS.left + 2,
        y: cellY,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    // Incident ID
    if (vehicle.incidentIdNo) {
      page.drawText(truncate(vehicle.incidentIdNo, cols.incidentId - 4), {
        x: MARGINS.left + cols.order + 2,
        y: cellY,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    // Classification
    page.drawText(truncate(vehicle.classification, cols.class - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Make
    page.drawText(truncate(vehicle.make, cols.make - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Category/Type
    page.drawText(truncate(vehicle.categoryKindType, cols.category - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Features
    if (vehicle.features) {
      page.drawText(truncate(vehicle.features, cols.features - 4), {
        x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + 2,
        y: cellY,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    // Agency/Owner
    page.drawText(truncate(vehicle.agencyOwner, cols.agency - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Operator
    page.drawText(truncate(vehicle.operatorNameContact, cols.operator - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // License/ID
    page.drawText(truncate(vehicle.vehicleLicenseId, cols.license - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Assignment
    page.drawText(truncate(vehicle.incidentAssignment, cols.assignment - 4), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + cols.license + 2,
      y: cellY,
      size: FONTS.tiny,
      font: normalFont,
      color: COLORS.black,
    });
    
    // Start Date/Time (multi-line)
    const startDate = new Date(vehicle.startDateTime);
    page.drawText(startDate.toLocaleDateString(), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + cols.license + cols.assignment + 2,
      y: cellY,
      size: FONTS.tiny - 0.5,
      font: normalFont,
      color: COLORS.black,
    });
    page.drawText(startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), {
      x: MARGINS.left + cols.order + cols.incidentId + cols.class + cols.make + cols.category + cols.features + cols.agency + cols.operator + cols.license + cols.assignment + 2,
      y: cellY - 7,
      size: FONTS.tiny - 0.5,
      font: normalFont,
      color: COLORS.darkGray,
    });
    
    y -= rowHeight;
  });
  
  return y;
}

/**
 * Section 4: Signature Block
 */
async function renderSignature(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS218FormData,
  pdfDoc: any,
  startY: number
): Promise<number> {
  let y = startY;
  
  page.drawText('6. PREPARED BY', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 18;
  
  // Signature line
  page.drawLine({
    start: { x: MARGINS.left, y: y - 25 },
    end: { x: MARGINS.left + 180, y: y - 25 },
    thickness: 0.5,
    color: COLORS.darkGray,
  });
  
  // Embed signature if present
  if (formData.preparedBy.signature) {
    try {
      const base64Data = formData.preparedBy.signature.replace(/^data:image\/png;base64,/, '');
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(signatureImage, {
        x: MARGINS.left,
        y: y - 23,
        width: 140,
        height: 28,
      });
    } catch (error) {
      page.drawText('[Digital Signature Present]', {
        x: MARGINS.left + 5,
        y: y - 15,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.darkGray,
      });
    }
  }
  
  // Details (right side)
  page.drawText(`Name: ${formData.preparedBy.name}`, {
    x: MARGINS.left + 200,
    y: y - 5,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText(`Position/Title: ${formData.preparedBy.positionTitle}`, {
    x: MARGINS.left + 200,
    y: y - 17,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText(`Date/Time: ${new Date(formData.preparedBy.signatureTimestamp).toLocaleString()}`, {
    x: MARGINS.left + 200,
    y: y - 29,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  return y - 35;
}

/**
 * Footer - Form information
 */
function renderFooter(page: any, normalFont: any, pageNum: number, totalPages: number): void {
  const { width } = page.getSize();
  const footerY = MARGINS.bottom + 5;
  
  const footerText = `ICS 218 - Support Vehicle/Equipment Inventory | USAR Task Force | Rev. 2026 | Page ${pageNum} of ${totalPages}`;
  const footerWidth = normalFont.widthOfTextAtSize(footerText, FONTS.tiny);
  
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: footerY,
    size: FONTS.tiny,
    font: normalFont,
    color: COLORS.lightGray,
  });
}

/**
 * Optional Watermark
 */
function renderWatermark(page: any, normalFont: any, watermarkText: string): void {
  const { width, height } = page.getSize();
  
  page.drawText(watermarkText, {
    x: width / 2 - 100,
    y: height / 2,
    size: 48,
    font: normalFont,
    color: rgb(0.9, 0.9, 0.9),
    rotate: { angle: 45, type: 'degrees' },
    opacity: 0.3,
  });
}
