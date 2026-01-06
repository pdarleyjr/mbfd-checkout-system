# USAR Task Force ICS-212 WF Vehicle Inspection System

**Version 1.0** | **Status**: Phase 0 - Infrastructure Setup Complete

Digital ICS-212 WF (Wildland Fire) vehicle safety inspection form system for USAR operations.

---

## Overview

This system replaces paper-based USAR Task Force ICS-212 WF vehicle safety inspections with a mobile-first digital solution that maintains perfect visual fidelity to official federal forms (NFES 001251) while enabling offline operation, digital signatures, and centralized management.

### Key Features

- ✅ **Official ICS-212 WF Form Layout** - 99.5%+ fidelity to NFES 001251
- ✅ **Digital Signature Capture** - Canvas-based signatures with legal metadata
- ✅ **Dual Approval Workflow** - Inspector → Operator signature chain
- ✅ **PDF Generation** - Pixel-perfect PDFs with 7-year retention
- ✅ **Safety Item Validation** - Automatic HOLD/RELEASE determination
- ✅ **Mobile-Responsive Design** - Tablet and phone optimized
- ✅ **Offline-Capable PWA** - Works without internet connectivity
- ✅ **GitHub Tracking** - Complete audit trail with issue tracking
- ✅ **Email Notifications** - Automated notifications via Gmail
- ✅ **7-Year Compliance** - Federal compliance ready

---

## Technology Stack

**Frontend**:
- React 18 + TypeScript
- Tailwind CSS (utility-first styling)
- PWA (Progressive Web App)
- Vite (build tool)

**Backend**:
- Cloudflare Workers (edge compute)
- R2 (PDF storage with 7-year retention)
- D1/SQLite (metadata and search)
- KV (configuration caching)

**Integrations**:
- GitHub Issues (primary tracking + audit trail)
- Gmail API (notifications)
- PDFKit (official form generation)
- Google Sheets (optional: vehicle data auto-fill)

**Infrastructure Cost**: ~$7-10/month

---

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers paid plan ($5/month)
- GitHub account (FLTF2-USAR)
- Gmail account for notifications
- Google Cloud Project

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
```

---

## Project Structure

```
usar-ics212-system/
├── src/                          # React frontend
│   ├── components/              # React components
│   ├── lib/                     # Utilities and config
│   ├── types/                   # TypeScript types
│   └── App.tsx                  # Main application
├── worker/                      # Cloudflare Worker
│   └── mbfd-github-proxy/       # API Worker
│       ├── src/                 # Worker source code
│       ├── wrangler.jsonc       # Cloudflare configuration
│       └── migrations/          # D1 database migrations
├── public/                      # Static assets
├── docs/                        # Documentation
│   ├── CLOUDFLARE_SETUP.md     # Cloudflare configuration guide
│   └── PHASE_0_COMPLETION.md   # Phase 0 completion summary
└── README.md                    # This file
```

---

## Migration from MBFD

This system is forked from the **MBFD Fire Apparatus Checkout System**, preserving **75% of the proven infrastructure** while adapting for ICS-212 WF requirements.

### Key Changes from MBFD:
- **Form Type**: Apparatus checkout → ICS-212 WF vehicle inspection
- **PDF Generation**: New PDFKit-based renderer for official form
- **Digital Signatures**: New dual-signature workflow
- **Storage**: Added R2 bucket for PDF archival
- **Compliance**: 7-year retention for federal requirements

---

## Development Roadmap

### ✅ Phase 0: Infrastructure Setup (Week 1)
- [x] Fork MBFD repository to FLTF2-USAR
- [x] Create new workspace directory
- [x] Configure Git with FLTF2-USAR credentials
- [x] Repository cloned and initialized
- [ ] Cloudflare Workers, D1, R2, KV provisioned
- [ ] GitHub API and Gmail OAuth configured
- [ ] Initial Worker deployed to staging

### 🔄 Phase 1: Core Form MVP (Weeks 2-4)
- [ ] Build ICS-212 form component
- [ ] Implement 17 inspection items with validation
- [ ] Add safety item business logic
- [ ] Connect to Worker API
- [ ] Create GitHub Issues for submissions

### 🔄 Phase 2: PDF Generation (Weeks 5-6)
- [ ] Integrate PDFKit library
- [ ] Achieve 99.5%+ visual fidelity
- [ ] Set up R2 bucket for storage
- [ ] Generate PDFs from form data

### 🔄 Phase 3: Digital Signatures (Week 7)
- [ ] Implement signature capture component
- [ ] Build two-stage workflow (inspector → operator)
- [ ] Embed signatures in PDF

### 🔄 Phase 4: Admin Portal (Week 8)
- [ ] Create admin dashboard
- [ ] Add search and filtering
- [ ] PDF download and distribution

### 🔄 Phase 5: Polish & Testing (Weeks 9-10)
- [ ] Responsive design refinement
- [ ] Accessibility compliance (WCAG AA)
- [ ] Cross-browser testing
- [ ] User acceptance testing

### 🎯 Phase 6: Production Launch (Week 11)
- [ ] Deploy to production
- [ ] User training and documentation
- [ ] Limited pilot rollout
- [ ] Monitor and collect feedback

---

## Architecture Documentation

Complete architectural analysis and implementation guides are available in the source repository:

- **[ICS-212 Architectural Blueprint](../mbfd-checkout-system/usar-ics212-architecture/USAR-ICS212-ARCHITECTURAL-BLUEPRINT.md)** - Executive overview
- **[Implementation Roadmap](../mbfd-checkout-system/usar-ics212-architecture/10-implementation-roadmap/IMPLEMENTATION-ROADMAP.md)** - 11-week plan
- **[Step-by-Step Guide](../mbfd-checkout-system/usar-ics212-architecture/08-migration-strategy/step-by-step-guide.md)** - Detailed migration instructions
- **[Configuration Mapping](../mbfd-checkout-system/usar-ics212-architecture/08-migration-strategy/configuration-mapping.md)** - Environment setup

---

## Contributing

This is a private project for USAR Task Force operations. For questions or issues:

1. Create a GitHub Issue
2. Tag with appropriate labels (bug, enhancement, phase-0, etc.)
3. Assign to project maintainer

---

## License

MIT License - See LICENSE file for details

---

## Support & Contact

**Repository**: https://github.com/FLTF2-USAR/usar-ics212-system  
**Parent Project**: Forked from [mbfd-checkout-system](https://github.com/pdarleyjr/mbfd-checkout-system)  

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-06  
**Status**: Phase 0 Complete - Infrastructure Ready for Development
