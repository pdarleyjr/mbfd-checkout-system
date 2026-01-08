/**
 * ICS-212 WF Vehicle Safety Inspection Form - PDF Generation Module
 *
 * Generates pixel-perfect official ICS-212 Wildfire edition PDFs with:
 * - Official government form layout
 * - Embedded digital signatures
 * - Release decision logic
 * - NIMS compliance formatting
 *
 * Target: 99.5%+ visual fidelity, <500ms generation, <500KB file size
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ICS212FormData, InspectionItem, DigitalSignature } from '../../../src/types';

// PDF Constants - Official ICS-212 WF Layout Specifications
const PAGE_SIZE = { width: 612, height: 792 }; // 8.5" x 11" @ 72 DPI
const MARGINS = { top: 36, bottom: 36, left: 36, right: 36 }; // 0.5" margins
const CONTENT_WIDTH = PAGE_SIZE.width - MARGINS.left - MARGINS.right; // 540pt

// Font Sizes
const FONTS = {
  title: 16,
  subtitle: 12,
  sectionHeader: 11,
  normal: 10,
  small: 9,
  tiny: 7,
};

// Colors (RGB 0-1 scale)
const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.6, 0.6, 0.6),
  holdRed: rgb(0.99, 0.89, 0.89), // #fee2e2
  holdRedText: rgb(0.6, 0.11, 0.11), // #991b1b
  releaseGreen: rgb(0.82, 0.98, 0.90), // #d1fae5
  releaseGreenText: rgb(0.02, 0.37, 0.27), // #065f46
  boxStroke: rgb(0, 0, 0),
};

/**
 * PDF Generation Options
 */
export interface PDFGenerationOptions {
  formData: ICS212FormData;
  includeSignatures: boolean;
  watermark?: string;
}

/**
 * PDF Generation Result
 */
export interface PDFGenerationResult {
  buffer: ArrayBuffer;
  filename: string;
  size: number;
  generatedAt: string;
}

/**
 * Main PDF Generation Function
 * Orchestrates the complete PDF generation process
 */
export async function generateICS212PDF(
  options: PDFGenerationOptions
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  
  try {
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
    
    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Track Y position as we render sections
    let currentY = PAGE_SIZE.height - MARGINS.top;
    
    // Render all sections
    currentY = renderHeader(page, normalFont, boldFont, options.formData, currentY);
    currentY = renderIncidentInfo(page, normalFont, boldFont, options.formData, currentY - 10);
    currentY = renderVehicleInfo(page, normalFont, boldFont, options.formData, currentY - 15);
    currentY = renderInspectionGrid(page, normalFont, boldFont, options.formData, currentY - 15);
    currentY = renderComments(page, normalFont, boldFont, options.formData, currentY - 15);
    currentY = renderReleaseDecision(page, normalFont, boldFont, options.formData, currentY - 15);
    currentY = await renderSignatures(page, normalFont, boldFont, options.formData, pdfDoc, currentY - 15);
    renderFooter(page, normalFont);
    
    // Watermark if specified
    if (options.watermark) {
      renderWatermark(page, normalFont, options.watermark);
    }
    
    // Convert to buffer
    const pdfBytes = await pdfDoc.save();
    const buffer = pdfBytes.buffer as ArrayBuffer;
    
    const generationTime = Date.now() - startTime;
    console.log(`PDF generated in ${generationTime}ms, size: ${(buffer.byteLength / 1024).toFixed(2)}KB`);
    
    return {
      buffer,
      filename: `ICS212-${options.formData.vehicleIdNo}-${Date.now()}.pdf`,
      size: buffer.byteLength,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Section 1: Header - Official ICS-212 WF Title Block
 */
function renderHeader(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  const { width, height } = page.getSize();
  let y = startY;
  
  // Main title: ICS-212
  page.drawText('ICS-212', {
    x: width / 2 - 40,
    y: y,
    size: FONTS.title,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 18;
  
  // Subtitle: VEHICLE SAFETY INSPECTION FORM
  const subtitle = 'VEHICLE SAFETY INSPECTION FORM';
  const subtitleWidth = normalFont.widthOfTextAtSize(subtitle, FONTS.subtitle);
  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: y,
    size: FONTS.subtitle,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 15;
  
  // Edition: Wildfire (WF) Edition
  const edition = 'Wildfire (WF) Edition';
  const editionWidth = normalFont.widthOfTextAtSize(edition, FONTS.normal);
  page.drawText(edition, {
    x: (width - editionWidth) / 2,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  // Form ID and date in top-right corner
  const formIdText = `Form ID: ${formData.formId || 'N/A'}`;
  page.drawText(formIdText, {
    x: width - MARGINS.right - normalFont.widthOfTextAtSize(formIdText, FONTS.small),
    y: startY,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.darkGray,
  });
  
  const dateText = `Date: ${new Date(formData.inspectorDate).toLocaleDateString()}`;
  page.drawText(dateText, {
    x: width - MARGINS.right - normalFont.widthOfTextAtSize(dateText, FONTS.small),
    y: startY - 12,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.darkGray,
  });
  
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
 * Section 2: Incident Information Block
 */
function renderIncidentInfo(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  let y = startY;
  
  // Section header
  page.drawText('1. INCIDENT INFORMATION', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 20;
  
  // Incident Name
  page.drawText('Incident Name:', {
    x: MARGINS.left,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.incidentName || 'N/A', {
    x: MARGINS.left + 100,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  // Order Number (right side)
  page.drawText('Order No:', {
    x: MARGINS.left + 320,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.orderNo || 'N/A', {
    x: MARGINS.left + 390,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  return y - 5;
}

/**
 * Section 3: Vehicle Information Block
 */
function renderVehicleInfo(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  let y = startY;
  
  // Section header
  page.drawText('2. VEHICLE INFORMATION', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 20;
  
  // Row 1: Vehicle ID & License
  page.drawText('Vehicle ID:', {
    x: MARGINS.left,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.vehicleIdNo || 'N/A', {
    x: MARGINS.left + 70,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText('License:', {
    x: MARGINS.left + 180,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.vehicleLicenseNo || 'N/A', {
    x: MARGINS.left + 240,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText('Type:', {
    x: MARGINS.left + 360,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.vehicleType || 'N/A', {
    x: MARGINS.left + 400,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  y -= 15;
  
  // Row 2: Agency/Unit & Odometer
  page.drawText('Agency/Unit:', {
    x: MARGINS.left,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(formData.agencyRegUnit || 'N/A', {
    x: MARGINS.left + 80,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText('Odometer:', {
    x: MARGINS.left + 320,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText(`${formData.odometerReading || 0} miles`, {
    x: MARGINS.left + 390,
    y: y,
    size: FONTS.normal,
    font: normalFont,
    color: COLORS.black,
  });
  
  return y - 5;
}

/**
 * Section 4: Inspection Grid - 17 items with Pass/Fail/N/A checkboxes
 * CRITICAL: This is the heart of the form
 */
function renderInspectionGrid(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  let y = startY;
  
  // Section header
  page.drawText('3. INSPECTION ITEMS', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 20;
  
  // Table header
  page.drawText('Item', {
    x: MARGINS.left,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText('Pass', {
    x: MARGINS.left + 340,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText('Fail', {
    x: MARGINS.left + 390,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  page.drawText('N/A', {
    x: MARGINS.left + 440,
    y: y,
    size: FONTS.small,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 2;
  
  // Horizontal line under header
  page.drawLine({
    start: { x: MARGINS.left, y: y },
    end: { x: PAGE_SIZE.width - MARGINS.right, y: y },
    thickness: 0.5,
    color: COLORS.black,
  });
  
  y -= 12;
  
  // Render each inspection item
  const checkboxSize = 10;
  const checkboxX = {
    pass: MARGINS.left + 345,
    fail: MARGINS.left + 395,
    na: MARGINS.left + 445,
  };
  
  formData.inspectionItems.forEach((item: InspectionItem, index: number) => {
    // Safety item marker
    const safetyMarker = item.isSafetyItem ? '⚠ ' : '';
    
    // Item description with number
    const itemText = `${item.itemNumber}. ${safetyMarker}${item.description}`;
    page.drawText(itemText, {
      x: MARGINS.left,
      y: y,
      size: FONTS.small,
      font: item.isSafetyItem ? boldFont : normalFont,
      color: COLORS.black,
      maxWidth: 320,
    });
    
    // Draw checkboxes
    // Pass checkbox
    page.drawRectangle({
      x: checkboxX.pass,
      y: y - 2,
      width: checkboxSize,
      height: checkboxSize,
      borderColor: COLORS.boxStroke,
      borderWidth: 1,
    });
    
    if (item.status === 'pass') {
      page.drawText('✓', {
        x: checkboxX.pass + 2,
        y: y - 1,
        size: FONTS.normal,
        font: boldFont,
        color: COLORS.releaseGreenText,
      });
    }
    
    // Fail checkbox
    page.drawRectangle({
      x: checkboxX.fail,
      y: y - 2,
      width: checkboxSize,
      height: checkboxSize,
      borderColor: COLORS.boxStroke,
      borderWidth: 1,
    });
    
    if (item.status === 'fail') {
      page.drawText('✓', {
        x: checkboxX.fail + 2,
        y: y - 1,
        size: FONTS.normal,
        font: boldFont,
        color: COLORS.holdRedText,
      });
    }
    
    // N/A checkbox
    page.drawRectangle({
      x: checkboxX.na,
      y: y - 2,
      width: checkboxSize,
      height: checkboxSize,
      borderColor: COLORS.boxStroke,
      borderWidth: 1,
    });
    
    if (item.status === 'n/a') {
      page.drawText('✓', {
        x: checkboxX.na + 2,
        y: y - 1,
        size: FONTS.normal,
        font: boldFont,
        color: COLORS.darkGray,
      });
    }
    
    // Add comments if present
    if (item.comments) {
      y -= 12;
      page.drawText(`   → ${item.comments}`, {
        x: MARGINS.left + 10,
        y: y,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.darkGray,
        maxWidth: 450,
      });
    }
    
    y -= 18;
    
    // Page break if needed (leave room for other sections)
    if (y < 250 && index < formData.inspectionItems.length - 1) {
      // Would need to add new page here for very long forms
      console.warn('Form may need pagination for this many items');
    }
  });
  
  return y;
}

/**
 * Section 5: Additional Comments
 */
function renderComments(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  let y = startY;
  
  // Section header
  page.drawText('4. ADDITIONAL COMMENTS / NOTES', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 20;
  
  // Draw comment box
  const boxHeight = 60;
  page.drawRectangle({
    x: MARGINS.left,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    borderColor: COLORS.boxStroke,
    borderWidth: 1,
  });
  
  // Render comments or placeholder
  if (formData.additionalComments) {
    const lines = formData.additionalComments.split('\n');
    let commentY = y - 12;
    
    lines.slice(0, 4).forEach((line) => { // Max 4 lines
      page.drawText(line, {
        x: MARGINS.left + 5,
        y: commentY,
        size: FONTS.small,
        font: normalFont,
        color: COLORS.black,
        maxWidth: CONTENT_WIDTH - 10,
      });
      commentY -= 12;
    });
  } else {
    page.drawText('No additional comments', {
      x: MARGINS.left + 5,
      y: y - 15,
      size: FONTS.small,
      font: normalFont,
      color: COLORS.lightGray,
    });
  }
  
  return y - boxHeight - 5;
}

/**
 * Section 6: Release Decision - Color-coded HOLD or RELEASE
 */
function renderReleaseDecision(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  startY: number
): number {
  let y = startY;
  
  // Section header
  page.drawText('5. RELEASE DECISION', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 25;
  
  const isHold = formData.releaseStatus === 'hold';
  const decisionText = isHold ? '🔴 HOLD FOR REPAIRS' : '🟢 RELEASED';
  const boxWidth = 220;
  const boxHeight = 35;
  
  // Draw colored decision box
  page.drawRectangle({
    x: MARGINS.left,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: isHold ? COLORS.holdRed : COLORS.releaseGreen,
    borderColor: COLORS.boxStroke,
    borderWidth: 2,
  });
  
  // Decision text
  page.drawText(decisionText, {
    x: MARGINS.left + 10,
    y: y - 22,
    size: FONTS.subtitle,
    font: boldFont,
    color: isHold ? COLORS.holdRedText : COLORS.releaseGreenText,
  });
  
  return y - boxHeight - 5;
}

/**
 * Section 7: Signature Blocks - Inspector & Operator
 */
async function renderSignatures(
  page: any,
  normalFont: any,
  boldFont: any,
  formData: ICS212FormData,
  pdfDoc: any,
  startY: number
): Promise<number> {
  let y = startY;
  
  // Section header
  page.drawText('6. SIGNATURES', {
    x: MARGINS.left,
    y: y,
    size: FONTS.sectionHeader,
    font: boldFont,
    color: COLORS.black,
  });
  
  y -= 20;
  
  // Inspector Signature
  page.drawText('Inspector Signature:', {
    x: MARGINS.left,
    y: y,
    size: FONTS.normal,
    font: boldFont,
    color: COLORS.black,
  });
  
  // Signature line
  page.drawLine({
    start: { x: MARGINS.left, y: y - 35 },
    end: { x: MARGINS.left + 200, y: y - 35 },
    thickness: 0.5,
    color: COLORS.darkGray,
  });
  
  // If signature image is present, embed it
  if (formData.inspectorSignature?.imageData) {
    try {
      // Extract base64 data
      const base64Data = formData.inspectorSignature.imageData.replace(/^data:image\/png;base64,/, '');
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(signatureImage, {
        x: MARGINS.left,
        y: y - 33,
        width: 150,
        height: 30,
      });
    } catch (error) {
      // Fallback if image embedding fails
      page.drawText('[Digital Signature Present]', {
        x: MARGINS.left + 5,
        y: y - 20,
        size: FONTS.tiny,
        font: normalFont,
        color: COLORS.darkGray,
      });
    }
  }
  
  // Inspector details (right side)
  page.drawText(`Name: ${formData.inspectorNamePrint}`, {
    x: MARGINS.left + 220,
    y: y - 10,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText(`Date: ${new Date(formData.inspectorDate).toLocaleDateString()}`, {
    x: MARGINS.left + 220,
    y: y - 22,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  page.drawText(`Time: ${formData.inspectorTime}`, {
    x: MARGINS.left + 220,
    y: y - 34,
    size: FONTS.small,
    font: normalFont,
    color: COLORS.black,
  });
  
  y -= 55;
  
  // Operator Signature (if present)
  if (formData.operatorSignature || formData.operatorNamePrint) {
    page.drawText('Operator Signature:', {
      x: MARGINS.left,
      y: y,
      size: FONTS.normal,
      font: boldFont,
      color: COLORS.black,
    });
    
    // Signature line
    page.drawLine({
      start: { x: MARGINS.left, y: y - 35 },
      end: { x: MARGINS.left + 200, y: y - 35 },
      thickness: 0.5,
      color: COLORS.darkGray,
    });
    
    // If operator signature image is present
    if (formData.operatorSignature?.imageData) {
      try {
        const base64Data = formData.operatorSignature.imageData.replace(/^data:image\/png;base64,/, '');
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const signatureImage = await pdfDoc.embedPng(imageBytes);
        
        page.drawImage(signatureImage, {
          x: MARGINS.left,
          y: y - 33,
          width: 150,
          height: 30,
        });
      } catch (error) {
        page.drawText('[Digital Signature Present]', {
          x: MARGINS.left + 5,
          y: y - 20,
          size: FONTS.tiny,
          font: normalFont,
          color: COLORS.darkGray,
        });
      }
    }
    
    // Operator details (right side)
    if (formData.operatorNamePrint) {
      page.drawText(`Name: ${formData.operatorNamePrint}`, {
        x: MARGINS.left + 220,
        y: y - 10,
        size: FONTS.small,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    if (formData.operatorDate) {
      page.drawText(`Date: ${new Date(formData.operatorDate).toLocaleDateString()}`, {
        x: MARGINS.left + 220,
        y: y - 22,
        size: FONTS.small,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    if (formData.operatorTime) {
      page.drawText(`Time: ${formData.operatorTime}`, {
        x: MARGINS.left + 220,
        y: y - 34,
        size: FONTS.small,
        font: normalFont,
        color: COLORS.black,
      });
    }
    
    y -= 40;
  }
  
  return y;
}

/**
 * Footer - Form version and compliance information
 */
function renderFooter(page: any, normalFont: any): void {
  const { width } = page.getSize();
  const footerY = MARGINS.bottom + 10;
  
  const footerText = 'ICS-212 WF Vehicle Safety Inspection Form | USAR Task Force | NIMS Compliant | Rev. 2026';
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
 * Optional Watermark (for drafts, test forms, etc.)
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
