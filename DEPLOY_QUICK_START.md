# Deploy to AWS

The app is a static Vite site. GitHub Actions builds `dist/`, Terraform creates
a private S3 bucket and CloudFront distribution, and the workflow uploads the
build and invalidates CloudFront.

## One-time migration from ECS

1. Confirm the current `DOMAIN_NAME` and the existing, ISSUED
   `ACM_CERTIFICATE_ARN` in `us-east-1`.
2. Configure AWS SSO and review the Terraform plan:

   ```sh
   aws sso login --profile dev-sso
   cd terraform
   export AWS_PROFILE=dev-sso
   export TF_VAR_domain_name="<existing-domain>"
   export TF_VAR_acm_certificate_arn="<existing-certificate-arn>"
   terraform init
   terraform plan
   ```

3. Only when the Terraform state still contains the legacy ECS stack, and you
   accept the interruption, remove it:

   ```sh
   terraform destroy
   ```

   This destroy has already been completed for the current environment. Do not
   run it again after the S3/CloudFront stack is present.

4. Create the S3/CloudFront stack, build and upload the site, then verify the
   CloudFront URL:

   ```sh
   terraform apply
   cd ..
   npm ci
   npm run check
   npm run build
   cd terraform
   aws s3 sync ../dist/ "s3://$(terraform output -raw site_bucket_name)" --delete
   aws cloudfront create-invalidation \
     --distribution-id "$(terraform output -raw cloudfront_distribution_id)" \
     --paths "/*"
   terraform output cloudfront_domain_name
   ```

5. In WordPress DNS, keep the same custom domain and change its existing
   application record to the CloudFront domain from the output. Keep the ACM
   validation CNAME unchanged. Verify HTTPS after DNS propagation.

The Terraform backend bucket under `terraform/bootstrap/` is separate; do not
delete it during the migration.

## Ongoing deployments

Configure GitHub repository variables `DOMAIN_NAME` and
`ACM_CERTIFICATE_ARN`, plus OIDC secrets `AWS_TF_PLAN_ROLE_TO_ASSUME` and
`AWS_TF_APPLY_ROLE_TO_ASSUME`. Keep production Environment approval enabled.
Pushes to `main` run build, Terraform apply, S3 sync, and CloudFront
invalidation. See [terraform/README.md](terraform/README.md) for role
permissions and details.
