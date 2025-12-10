# MBFD Checkout System

A serverless Progressive Web App (PWA) for the Miami Beach Fire Department's daily apparatus inspection workflow.

## 🚀 Live Application

**URL:** https://pdarleyjr.github.io/mbfd-checkout-system/

## ✨ Features

- 📱 **Mobile-First PWA** - Installable on iOS/Android devices
- 🔄 **GitHub Issues Database** - No external database required
- 🚒 **Multi-Apparatus Support** - Rescue 1, 2, 3, 11, and Engine 1
- ✅ **Smart Defect Tracking** - Automatic deduplication
- 📊 **Admin Dashboard** - Fleet status and defect management
- 🔔 **Email Notifications** - Automatic alerts on new defects

## 🏗️ Architecture

**100% Serverless** - Runs entirely on GitHub Pages:
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: GitHub Issues (IssueOps pattern)
- **Backend**: GitHub Actions for automation
- **Deployment**: Automated via GitHub Actions
- **Authentication**: Token embedded during build (no user setup required)

## 👥 For Users (Firefighters)

**NO SETUP NEEDED!** Just use the app:

1. Visit https://pdarleyjr.github.io/mbfd-checkout-system/
2. Enter your name
3. Select your rank (Firefighter, DE, Lieutenant, Captain, Chief)
4. Select your apparatus (Rescue 1, 2, 3, 11, or Engine 1)
5. Click "Start Inspection"
6. Go through each compartment marking items as:
   - ✅ **Present/Working** (default)
   - ❌ **Missing** (creates GitHub Issue)
   - ⚠️ **Damaged** (creates GitHub Issue)
7. Complete inspection - automatic log entry created

## 🔧 For Administrators

### One-Time Setup Required

The system administrator must configure a GitHub token **ONE TIME** as a repository secret. After that, all users can use the system without any setup.

**👉 [Read the Complete Setup Guide](./SETUP.md)**

Quick summary:
1. Create a GitHub Personal Access Token (fine-grained)
2. Add it as a repository secret named `MBFD_GITHUB_TOKEN`
3. Push code to trigger deployment
4. Users can now access the system!

### Admin Dashboard

Access at: https://pdarleyjr.github.io/mbfd-checkout-system/admin

- View fleet status (all apparatus)
- See all open defects
- Resolve defects with notes
- Monitor inspection history

## 🔄 Deployment

Deployment is **fully automated** via GitHub Actions:

```bash
# Any push to main triggers deployment
git add .
git commit -m "Update application"
git push origin main

# Wait 2-3 minutes for Actions to complete
# Changes are live automatically
```

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm or yarn
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/pdarleyjr/mbfd-checkout-system.git
cd mbfd-checkout-system

# Install dependencies
npm install

# Create .env.local with your test token
echo "VITE_GITHUB_TOKEN=your_token_here" > .env.local

# Start development server
npm run dev

# Build for production
npm run build
```

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **React Router** - Navigation
- **Octokit** - GitHub API client
- **Lucide React** - Icons

## 📋 Checklist Data

The "Blue Sheet" inventory is stored in [`public/data/rescue_checklist.json`](./public/data/rescue_checklist.json)

To modify the checklist:
1. Edit the JSON file
2. Commit and push
3. Deployment happens automatically

## 🔐 Security

- Token is embedded in JavaScript bundle (visible to users)
- Token is **scoped only** to this repository
- Token has **read/write access only to Issues**
- Acceptable for internal departmental use
- For higher security, use a proper backend service

## 📞 Support

- **Technical Issues**: File an issue on GitHub
- **Setup Help**: See [SETUP.md](./SETUP.md)
- **General Questions**: Contact repository administrator

## 📄 License

Internal use only - Miami Beach Fire Department

---

**Built with ❤️ for Miami Beach Fire Department**
