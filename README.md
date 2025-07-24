# Jockular Kangaroo - K-12 Intervention Tracking System

A comprehensive web application for tracking and managing student interventions in K-12 school districts, featuring:

- 🔒 Authentication with [AWS Cognito](https://aws.amazon.com/cognito/) + NextAuth v5
- 🗄️ Database with [AWS RDS Aurora Serverless v2](https://aws.amazon.com/rds/aurora/) (PostgreSQL)
- 🎨 UI with [Shadcn](https://ui.shadcn.com) and Tailwind CSS
- 🚀 Deployment with [AWS Amplify](https://aws.amazon.com/amplify)
- 🏗️ Infrastructure as Code with [AWS CDK](https://aws.amazon.com/cdk/)

## AWS Architecture

This project provisions all core infrastructure using AWS CDK, following the AWS Well-Architected Framework and best practices for cost tracking and security:

- **Networking:** Isolated VPC with public and private subnets
- **Database:** Aurora Serverless v2 PostgreSQL with RDS Data API and Secrets Manager
- **Authentication:** Amazon Cognito with Google federated login + NextAuth v5
- **Storage:** Private S3 bucket for document storage (SSE, versioning, lifecycle)
- **Frontend Hosting:** AWS Amplify with SSR support (WEB_COMPUTE platform)
- **Tagging:** All resources are tagged for cost allocation (Environment, Project, Owner)

## Features

- 📚 **Student Management**: Comprehensive student profiles and tracking
- 📈 **Intervention Tracking**: Record, monitor, and analyze student interventions
- 📄 **Document Management**: Upload and attach supporting documents to interventions
- 👥 **Role-Based Access**: Teachers, administrators, and counselors with appropriate permissions
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Shadcn UI
- 🌙 **Dark Mode**: Full dark mode support for comfortable use any time
- 🔐 **Secure Authentication**: AWS Cognito integration with Google SSO support
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/psd401/jockular-kangaroo.git
   cd jockular-kangaroo
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

The project uses AWS RDS Data API for database operations:

- Generate migrations: `npm run db:generate`
- Push schema changes: `npm run db:push`
- Open Drizzle Studio: `npm run db:studio`

For production, all database operations go through the RDS Data API using the `executeSQL` function from `/lib/db/data-api-adapter.ts`.

## Deployment

### Quick Deploy

```bash
cd infra
cdk deploy --all \
  --parameters JockularKangaroo-AuthStack-Dev:GoogleClientId=your-dev-client-id \
  --parameters JockularKangaroo-AuthStack-Prod:GoogleClientId=your-prod-client-id \
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