import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface StorageStackProps extends cdk.StackProps {
  environment: 'dev' | 'prod';
}

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // S3 bucket for document storage
    const bucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: props.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      lifecycleRules: [
        {
          id: 'ExpireDeletedObjects',
          enabled: true,
          expiration: cdk.Duration.days(30),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Output the S3 bucket name - prefixed with JockularKangaroo to avoid conflicts
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket for document storage',
      exportName: `JockularKangaroo-${props.environment}-DocumentsBucketName`,
    });
  }
}
