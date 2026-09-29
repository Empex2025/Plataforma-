import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const region = process.env.S3_REGION ?? 'us-east-1';
const bucket = process.env.S3_BUCKET ?? 'imports';
const accessKeyId = process.env.S3_ACCESS_KEY ?? 'minioadmin';
const secretAccessKey = process.env.S3_SECRET_KEY ?? 'minioadmin';

const client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

async function ensureBucket() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket already exists: ${bucket}`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket created: ${bucket}`);
  }
}

async function applyPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadStoreMedia',
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/stores/*`],
      },
    ],
  };

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }),
  );
  console.log(`Public read policy applied to ${bucket}/stores/*`);
}

try {
  await ensureBucket();
  await applyPolicy();
  console.log(`Storage ready at ${endpoint}/${bucket}`);
} catch (error) {
  console.error(`Failed to ensure storage bucket: ${error.message}`);
  process.exit(1);
}
