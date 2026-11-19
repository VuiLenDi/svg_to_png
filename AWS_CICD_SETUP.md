# AWS CI/CD for the Static Site

The deployment uses GitHub Actions, a private S3 bucket, and CloudFront. ECS,
Fargate, ECR, the ALB, and the application VPC are not required to serve this
browser-only application.

## GitHub configuration

Configure these repository variables:

- `DOMAIN_NAME`: the existing application domain managed in WordPress
- `ACM_CERTIFICATE_ARN`: the existing ISSUED certificate ARN in `us-east-1`

Configure these repository secrets:

- `AWS_TF_PLAN_ROLE_TO_ASSUME`
- `AWS_TF_APPLY_ROLE_TO_ASSUME`

Use GitHub OIDC rather than static AWS access keys. Keep the `production`
Environment restricted to `main` and require reviewer approval.

## IAM permissions

Update the OIDC roles from the ECS deployment:

- Plan role: read Terraform state and describe/read the S3 and CloudFront
  resources used by the configuration.
- Apply role: Terraform state access, S3 bucket/policy configuration,
  CloudFront distribution and origin-access-control management, plus
  `s3:PutObject` and `s3:DeleteObject` on the static-site bucket and
  `cloudfront:CreateInvalidation`.

Scope permissions to the project resources. The S3 bucket must remain private;
CloudFront uses OAC to read its objects.

## Workflow

The workflow runs `npm ci`, `npm run check`, and `npm run build`. Pull requests
from the same repository run Terraform plan. Pushes to `main` use the production
environment to apply infrastructure, sync `dist/` to S3, and invalidate
CloudFront.

The Terraform apply transitions the existing Terraform-managed ECS stack to
static hosting. Review the initial plan carefully: it removes ECS, ALB, ECR,
and VPC resources. The existing domain name and ACM certificate are retained,
but the WordPress DNS record must be updated to the CloudFront distribution
domain after it is ready. The ACM DNS-validation record should not change.

See [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) for migration steps and
[terraform/README.md](terraform/README.md) for Terraform commands.
