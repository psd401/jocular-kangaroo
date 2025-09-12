# Jocular Kangaroo - K-12 Intervention Tracking System

A comprehensive web application for tracking and managing student interventions in K-12 school districts. Built to help educators document, monitor, and improve intervention strategies for student success.

## Technology Stack

- 🔒 **Authentication**: [AWS Cognito](https://aws.amazon.com/cognito/) + NextAuth v5 with role-based access
- 🗄️ **Database**: [AWS RDS Aurora Serverless v2](https://aws.amazon.com/rds/aurora/) (PostgreSQL) with Drizzle ORM
- 🎨 **UI**: [Shadcn](https://ui.shadcn.com) components with Tailwind CSS v4
- 🚀 **Deployment**: [AWS Amplify](https://aws.amazon.com/amplify) with SSR support
- 🏗️ **Infrastructure**: [AWS CDK](https://aws.amazon.com/cdk/) v2 for all resources
- 📄 **Storage**: AWS S3 for secure document attachments
- ⚡ **Framework**: Next.js 15 with App Router and Server Actions

## AWS Architecture

This project provisions all core infrastructure using AWS CDK, following the AWS Well-Architected Framework and best practices for cost tracking and security:

- **Networking:** Isolated VPC with public and private subnets
- **Database:** Aurora Serverless v2 PostgreSQL with RDS Data API and Secrets Manager
- **Authentication:** Amazon Cognito with Google federated login + NextAuth v5
- **Storage:** Private S3 bucket for document storage (SSE, versioning, lifecycle)
- **Frontend Hosting:** AWS Amplify with SSR support (WEB_COMPUTE platform)
- **Tagging:** All resources are tagged for cost allocation (Environment, Project, Owner)

## Features

### Core Functionality
- 📚 **Student Management**: Comprehensive student profiles with demographics and status tracking
- 📈 **Intervention Tracking**: Create and monitor interventions across multiple categories:
  - Academic support (reading, math, study skills)
  - Behavioral interventions
  - Social-emotional learning
  - Attendance improvement
  - Health and wellness support
- 📋 **Program Templates**: Pre-configured intervention programs with goals and materials
- 🎯 **Goal Setting**: Track intervention goals and measure achievement
- 📅 **Session Management**: Document intervention sessions with progress notes
- 👥 **Team Collaboration**: Assign interventions to staff and track team members

### Administrative Features
- 🔐 **Role-Based Access Control**: Five distinct roles with tool-based permissions
- 📄 **Document Management**: Secure file uploads with S3 integration
- 📊 **Reports & Analytics**: Intervention effectiveness and student progress tracking
- 🏫 **Multi-School Support**: Manage interventions across district schools
- 📅 **Calendar Integration**: Schedule and track intervention sessions
- ⚙️ **System Settings**: Configurable district-wide settings

### Technical Features
- 🎨 **Modern UI**: Beautiful, accessible interface with Shadcn components
- 🌙 **Dark Mode**: Full dark mode support
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile
- 🔒 **Enterprise Security**: AWS Cognito with MFA support
- ⚡ **Real-time Updates**: Server Actions for instant data updates
- 🌐 **Accessibility**: WCAG compliant for inclusive access

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/psd401/jocular-kangaroo.git
   cd jocular-kangaroo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Set up your local database (if using local PostgreSQL):
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

Run the test suite:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

Run specific test file:
```bash
npm test -- path/to/test.test.ts
```

## Database Management

The project uses Drizzle ORM with AWS RDS Data API for type-safe database operations:

### Drizzle ORM Commands

- **Check configuration**: `npm run db:check` - Validate drizzle.config.ts
- **Pull schema**: `npm run db:pull` - Introspect database and generate schema
- **Generate migrations**: `npm run db:generate` - Create SQL migrations from schema changes
- **Apply migrations**: `npm run db:migrate` - Apply pending migrations to database
- **Push schema**: `npm run db:push` - Push schema changes directly (development only)
- **Open Drizzle Studio**: `npm run db:studio` - Visual database browser

### Database Setup

1. Ensure environment variables are configured in `.env.local`:
   ```
   RDS_RESOURCE_ARN=arn:aws:rds:region:account:cluster:name
   RDS_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:name
   RDS_DATABASE_NAME=your_database_name
   AWS_REGION=us-east-1
   ```

2. Test the connection:
   ```bash
   npm run ts-node scripts/test-drizzle-connection.ts
   ```

3. Pull existing schema from database:
   ```bash
   npm run db:pull
   ```

The project is migrating from direct RDS Data API calls to Drizzle ORM for improved type safety and developer experience.

## Deployment

### Quick Deploy

```bash
cd infra
cdk deploy --all \
  --parameters JocularKangaroo-AuthStack-Dev:GoogleClientId=your-dev-client-id \
  --parameters JocularKangaroo-AuthStack-Prod:GoogleClientId=your-prod-client-id \
  --context baseDomain=yourdomain.com
```

### Detailed Steps

1. Create required AWS Secrets Manager secrets (see `DEPLOYMENT.md`)
2. Bootstrap CDK in your AWS account
3. Deploy the infrastructure stacks
4. Configure environment variables in AWS Amplify Console
5. Push code to trigger Amplify deployment

See `docs/DEPLOYMENT.md` for full deployment instructions and `docs/OPERATIONS.md` for operational best practices.

## Project Structure

```
├── app/                  # Next.js App Router pages and layouts
├── components/          # UI components (Shadcn)
├── actions/            # Server actions for database operations
├── lib/                # Utility functions and helpers
├── infra/              # AWS CDK infrastructure code
├── public/             # Static assets
└── docs/               # Documentation
```

## Key Documentation

- [Deployment Guide](./docs/DEPLOYMENT.md) - Detailed deployment instructions
- [Operations Guide](./docs/OPERATIONS.md) - Operational procedures
- [Developer Guide](./DEVELOPER_GUIDE.md) - Development setup and workflow
- [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md) - Required environment variables
- [Technical Specification](./docs/SPECIFICATION.md) - Architecture and design
- [Navigation System](./docs/navigation.md) - Dynamic navigation documentation
- [S3 Uploads](./docs/project-plan-s3-large-uploads.md) - Large file upload implementation

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT - See [LICENSE](./LICENSE) for details

## Open Source

This project is open source and available for other school districts to use and adapt for their needs. We welcome contributions and feedback from the education community.