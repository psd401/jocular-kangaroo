import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as amplifyL1 from 'aws-cdk-lib/aws-amplify';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface FrontendStackProps extends cdk.StackProps {
  environment: 'dev' | 'prod';
  baseDomain: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Create Amplify app using GitHub App integration (no token required)
    const amplifyApp = new amplify.App(this, 'AmplifyApp', {
      appName: `jockular-kangaroo-${props.environment}`,
      description: `Jockular Kangaroo K-12 Intervention Tracking System - ${props.environment}`,
      platform: amplify.Platform.WEB_COMPUTE,
      autoBranchDeletion: true,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: 1,
        applications: [{
          frontend: {
            phases: {
              preBuild: {
                commands: [
                  'npm ci --legacy-peer-deps'
                ]
              },
              build: {
                commands: [
                  'env | grep -E "^AUTH_|^NEXT_PUBLIC_|^RDS_|^SQL_" >> .env',
                  'npm run build'
                ]
              }
            },
            artifacts: {
              baseDirectory: '.next',
              files: ['**/*']
            },
            cache: {
              paths: [
                'node_modules/**/*',
                '.next/cache/**/*'
              ]
            }
          }
        }]
      }),
      // Enable comprehensive logging
      customRules: [
        {
          source: '/<*>',
          target: '/index.html',
          status: amplify.RedirectStatus.NOT_FOUND_REWRITE
        }
      ],
      environmentVariables: {
        // Add a log group identifier for easier log discovery
        '_CUSTOM_LOG_GROUP': `/aws/amplify/jockular-kangaroo-${props.environment}`,
        'AMPLIFY_MONOREPO_APP_ROOT': '.'
      }
    });

    // Repository connection will be handled manually through AWS Amplify console
    // after installing the GitHub App for the organization

    // Create SSR Compute Role
    const ssrComputeRole = new iam.Role(this, 'SSRComputeRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: `SSR Compute role for Jockular Kangaroo ${props.environment}`,
      roleName: `jockular-kangaroo-ssr-compute-${props.environment}-${cdk.Stack.of(this).account}`,
      inlinePolicies: {
        'RDSDataAPIAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds-data:ExecuteStatement',
                'rds-data:BatchExecuteStatement',
                'rds-data:BeginTransaction',
                'rds-data:CommitTransaction',
                'rds-data:RollbackTransaction'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Create service role
    const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: `Service role for Jockular Kangaroo ${props.environment}`,
      roleName: `jockular-kangaroo-amplify-service-${props.environment}-${cdk.Stack.of(this).account}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify')
      ]
    });

    // Add RDS permissions to service role too
    amplifyRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rds-data:ExecuteStatement',
        'rds-data:BatchExecuteStatement',
        'rds-data:BeginTransaction',
        'rds-data:CommitTransaction',
        'rds-data:RollbackTransaction'
      ],
      resources: ['*']
    }));

    amplifyRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: ['*']
    }));

    // Override the service role
    const cfnApp = amplifyApp.node.defaultChild as amplifyL1.CfnApp;
    cfnApp.iamServiceRole = amplifyRole.roleArn;

    // Use Custom Resource to update the existing app with both service and compute roles
    const updateAppRoles = new cr.AwsCustomResource(this, 'UpdateAppRoles', {
      onCreate: {
        service: 'Amplify',
        action: 'updateApp',
        parameters: {
          appId: amplifyApp.appId,
          iamServiceRole: amplifyRole.roleArn,
          computeRoleArn: ssrComputeRole.roleArn
        },
        physicalResourceId: cr.PhysicalResourceId.of(`${amplifyApp.appId}-roles-update`)
      },
      onUpdate: {
        service: 'Amplify',
        action: 'updateApp',
        parameters: {
          appId: amplifyApp.appId,
          iamServiceRole: amplifyRole.roleArn,
          computeRoleArn: ssrComputeRole.roleArn
        }
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['amplify:UpdateApp', 'amplify:GetApp'],
          resources: [`arn:aws:amplify:${this.region}:${this.account}:apps/*`]
        }),
        new iam.PolicyStatement({
          actions: ['iam:PassRole'],
          resources: [ssrComputeRole.roleArn],
          conditions: {
            StringEquals: {
              'iam:PassedToService': 'amplify.amazonaws.com'
            }
          }
        })
      ])
    });

    // Ensure custom resource runs after the app exists
    updateAppComputeRole.node.addDependency(amplifyApp);
    updateAppComputeRole.node.addDependency(ssrComputeRole);

    // Domain association will be configured manually through AWS Amplify console
    // after the repository is connected via GitHub App

    // Configure AWS WAF for Amplify - Simplified configuration
    const webAcl = new wafv2.CfnWebACL(this, 'AmplifyWAF', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      description: `WAF for Jockular Kangaroo ${props.environment} environment`,
      rules: [
        // Basic rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2000 requests per 5 minutes per IP
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `AmplifyWAF-${props.environment}`
      }
    });

    // Note: WAF association with Amplify CloudFront distribution requires
    // the distribution ID which is not directly available from L2 construct.
    // This would typically be done via a custom resource or post-deployment step.
    
    // Output WAF ARN for manual association if needed
    new cdk.CfnOutput(this, 'WAFArn', {
      value: webAcl.attrArn,
      description: 'WAF WebACL ARN for Amplify app',
      exportName: `JockularKangaroo-${props.environment}-WAFArn`
    });

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.appId,
      description: 'Amplify App ID',
      exportName: `JockularKangaroo-${props.environment}-AmplifyAppId`,
    });
    new cdk.CfnOutput(this, 'AmplifyDefaultDomain', {
      value: amplifyApp.defaultDomain,
      description: 'Amplify Default Domain',
      exportName: `JockularKangaroo-${props.environment}-AmplifyDefaultDomain`,
    });
    new cdk.CfnOutput(this, 'SSRComputeRoleArn', {
      value: ssrComputeRole.roleArn,
      description: 'SSR Compute Role ARN',
      exportName: `JockularKangaroo-${props.environment}-SSRComputeRoleArn`,
    });

    // Environment variables instructions
    new cdk.CfnOutput(this, 'EnvironmentVariablesInstructions', {
      value: `After deployment, set the following environment variables in the AWS Amplify console:
      AUTH_URL=<set to your actual Amplify deployment URL>
      AUTH_SECRET=<generate with: openssl rand -base64 32>
      AUTH_COGNITO_CLIENT_ID=<from auth stack>
      AUTH_COGNITO_ISSUER=https://cognito-idp.${this.region}.amazonaws.com/<user-pool-id from auth stack>
      NEXT_PUBLIC_COGNITO_USER_POOL_ID=<from auth stack>
      NEXT_PUBLIC_COGNITO_CLIENT_ID=<from auth stack>
      NEXT_PUBLIC_COGNITO_DOMAIN=<from auth stack>
      NEXT_PUBLIC_AWS_REGION=${this.region}
      RDS_RESOURCE_ARN=<from database stack>
      RDS_SECRET_ARN=<from database stack>
      SQL_LOGGING=false`,
      description: 'Required environment variables for Amplify app'
    });
  }
}