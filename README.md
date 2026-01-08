# USAR ICS-212 & ICS-218 Forms System

**Version 2.0** | **Status**: ✅ Production Deployed

Digital ICS-212 (Vehicle Safety Inspection) and ICS-218 (Support Vehicle/Equipment Log) forms system for USAR operations.

---

## Overview

This system provides a comprehensive digital solution for USAR operations, supporting both **ICS-212 WF** (Wildland Fire) vehicle safety inspections and **ICS-218** support vehicle/equipment tracking. The system replaces paper-based forms with a mobile-first digital solution that maintains perfect visual fidelity to official federal forms while enabling offline operation, digital signatures, and centralized management.

### Key Features

#### ICS-212 Vehicle Safety Inspection
- ✅ **Official ICS-212 WF Form Layout** - 99.5%+ fidelity to NFES 001251
- ✅ **Digital Signature Capture** - Canvas-based signatures with legal metadata
- ✅ **Dual Approval Workflow** - Inspector → Operator signature chain
- ✅ **PDF Generation** - Pixel-perfect PDFs with 7-year retention
- ✅ **Safety Item Validation** - Automatic HOLD/RELEASE determination
- ✅ **GitHub Tracking** - Complete audit trail with issue tracking

#### ICS-218 Support Vehicle/Equipment Log (NEW)
- ✅ **Password-Protected Access** - Secure form submissions
- ✅ **Multi-Vehicle Support** - Track unlimited vehicles per incident
- ✅ **Airtable Integration** - 7-field auto-population from vehicle database
- ✅ **Official ICS-218 Format** - PDF matching federal form standards
- ✅ **Digital Signatures** - Prepared by signature with timestamp
- ✅ **GitHub Issue Creation** - Complete tracking for each submission
- ✅ **Vehicle Categories** - Ambulance, Buses, Helicopters, Construction Equipment, etc.

#### Admin Dashboard
- ✅ **Unified Form Management** - View both ICS-212 and ICS-218 forms
- ✅ **Form Type Filtering** - Filter by All/ICS 212/ICS 218
- ✅ **Combined Analytics** - Statistics and trends for both form types
- ✅ **PDF Downloads** - Instant access to generated PDFs
- ✅ **GitHub Integration** - Direct links to tracking issues
- ✅ **Mobile-Responsive** - Tablet and phone optimized

#### Universal Features
- ✅ **Mobile-Responsive Design** - Tablet and phone optimized
- ✅ **Offline-Capable PWA** - Works without internet connectivity
- ✅ **Email Notifications** - Automated notifications via Gmail
- ✅ **7-Year Compliance** - Federal compliance ready

---

## 🚀 Live Deployment

### Production URLs

- **Frontend**: https://pdarleyjr.github.io/usar-ics212-system
- **Backend API**: https://usar-ics212.pdarleyjr.workers.dev
- **GitHub**: https://github.com/pdarleyjr/mbfd-checkout-system

### Access Credentials

#### ICS-212 Form (Public Access)
- **URL**: https://pdarleyjr.github.io/usar-ics212-system/form
- **Access**: No password required

#### ICS-218 Form (Password Protected)
- **URL**: https://pdarleyjr.github.io/usar-ics212-system/ics218
- **Password**: `ICS218Deploy2026!`

#### Admin Dashboard
- **URL**: https://pdarleyjr.github.io/usar-ics212-system/admin
- **Password**: `AdminPass2026!`

---

## Technology Stack

**Frontend**:
- React 18 + TypeScript
- Tailwind CSS (utility-first styling)
- PWA (Progressive Web App)
- Vite (build tool)
- React Router v6

**Backend**:
- Cloudflare Workers (edge compute)
- R2 (PDF storage with 7-year retention)
- D1/SQLite (metadata and search)
- KV (configuration caching)

**Integrations**:
- GitHub Issues (primary tracking + audit trail)
- Airtable API (vehicle data auto-fill)
- Gmail API (notifications)
- PDFKit (official form generation)

**Infrastructure Cost**: ~$7-10/month

---

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers paid plan ($5/month)
- GitHub account
- Gmail account for notifications
- Airtable account for vehicle data

### Installation

See **[SETUP.md](./SETUP.md)** for detailed installation and configuration instructions.

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy worker
cd worker/mbfd-github-proxy
npx wrangler deploy
```

---

## Project Structure

```
usar-ics212-system/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ics212/              # ICS-212 form components
│   │   ├── ics218/              # ICS-218 form components (NEW)
│   │   ├── admin/               # Admin dashboard (UPDATED)
│   │   └── mobile/              # Mobile UI components
│   ├── lib/                     # Utilities and config
│   └── App.tsx                  # Main application
├── worker/                      # Cloudflare Worker
│   └── mbfd-github-proxy/
│       ├── src/
│       │   ├── handlers/        # API route handlers
│       │   │   ├── ics212-*.ts  # ICS-212 handlers
│       │   │   └── ics218-*.ts  # ICS-218 handlers (NEW)
│       │   ├── pdf/             # PDF generators
│       │   │   ├── ics212-generator.ts
│       │   │   └── ics218-generator.ts (NEW)
│       │   └── integrations/
│       │       ├── airtable.ts  # Vehicle data integration
│       │       └── github-ics218.ts (NEW)
│       ├── migrations/          # D1 database migrations
│       └── wrangler.jsonc       # Cloudflare configuration
├── docs/                        # Documentation
│   ├── ICS218_DEPLOYMENT_COMPLETE.md (NEW)
│   ├── AIRTABLE_VEHICLE_INTEGRATION.md
│   ├── CLOUDFLARE_SETUP.md
│   └── PHASE_0_COMPLETION.md
└── README.md                    # This file
```

---

## API Endpoints

### ICS-212 Endpoints

```
GET    /api/ics212/forms         - List all ICS-212 forms
GET    /api/ics212/forms/:id     - Get specific form
GET    /api/ics212/analytics     - Analytics data
POST   /api/ics212/submit        - Submit new form
GET    /api/ics212/pdf/:id       - Download PDF
```

### ICS-218 Endpoints (NEW)

```
GET    /api/ics218/forms         - List all ICS-218 forms
GET    /api/ics218/forms/:id     - Get specific form
POST   /api/ics218/submit        - Submit new form
POST   /api/ics218/validate-password - Validate access
GET    /api/ics218/pdf/:id       - Download PDF
```

### Vehicle Endpoints

```
GET    /api/vehicles/autocomplete?q=  - Search vehicles (Airtable)
```

---

## User Guides

### Submitting an ICS-212 Form

1. Navigate to https://pdarleyjr.github.io/usar-ics212-system
2. Click "ICS 212 - Vehicle Safety Inspection"
3. Fill incident information
4. Complete vehicle inspection checklist
5. Add digital signature
6. Review and submit
7. Download PDF copy

### Submitting an ICS-218 Form

1. Navigate to https://pdarleyjr.github.io/usar-ics212-system
2. Click "ICS 218 - Support Vehicle/Equipment Log"
3. Enter password: `ICS218Deploy2026!`
4. Fill incident information
5. Add vehicles:
   - Use autocomplete for Airtable vehicles (auto-fills 7 fields)
   - Or manually enter vehicle details
   - Add multiple vehicles as needed
6. Complete "Prepared By" section with signature
7. Review and submit
8. Download PDF copy

### Admin Dashboard

1. Navigate to https://pdarleyjr.github.io/usar-ics212-system/admin
2. Enter password: `AdminPass2026!`
3. **Forms Tab**:
   - Filter by form type (All/ICS 212/ICS 218)
   - Search forms
   - View details
   - Download PDFs
   - View GitHub issues
4. **Analytics Tab**:
   - View statistics for both form types
   - Analyze trends and patterns
   - Track vehicle counts (ICS-218)
   - Monitor HOLD/RELEASE rates (ICS-212)

---

## Development Roadmap

### ✅ Phase 0-5: Core Development (COMPLETED)
- [x] Infrastructure setup
- [x] ICS-212 form implementation
- [x] PDF generation
- [x] Digital signatures
- [x] Admin dashboard
- [x] Airtable integration

### ✅ Phase 6-8: ICS-218 Integration (COMPLETED)
- [x] ICS-218 form UI with multi-vehicle support
- [x] Password protection system
- [x] Airtable 7-field auto-population
- [x] ICS-218 PDF generation
- [x] GitHub issue creation for ICS-218
- [x] Admin dashboard updates for unified management
- [x] Combined analytics dashboard
- [x] Comprehensive documentation
- [x] Production deployment

---

## Documentation

Complete documentation available in [`/docs`](./docs):

- **[ICS218 Deployment Guide](./docs/ICS218_DEPLOYMENT_COMPLETE.md)** - Complete ICS-218 documentation
- **[Airtable Integration](./docs/AIRTABLE_VEHICLE_INTEGRATION.md)** - Vehicle autocomplete setup
- **[Cloudflare Setup](./docs/CLOUDFLARE_SETUP.md)** - Infrastructure configuration
- **[Phase 0 Completion](./docs/PHASE_0_COMPLETION.md)** - Initial setup summary

---

## Contributing

This is a private project for USAR Task Force operations. For questions or issues:

1. Create a GitHub Issue
2. Tag with appropriate labels (bug, enhancement, ics-212, ics-218, etc.)
3. Assign to project maintainer

---

## License

MIT License - See LICENSE file for details

---

## Support & Contact

**Repository**: https://github.com/pdarleyjr/mbfd-checkout-system  
**Issues**: https://github.com/pdarleyjr/mbfd-checkout-system/issues  
**Documentation**: See `/docs` folder

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-06  
**Status**: ✅ Production - ICS-212 & ICS-218 Fully Deployed
