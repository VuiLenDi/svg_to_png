# AWS Static Hosting

Terraform provisions a private S3 bucket and a CloudFront distribution with
Origin Access Control (OAC). The bucket is not publicly accessible. The existing
Terraform state bucket in `bootstrap/` is separate and is not removed by the
root configuration.

## Required values

Set these locally or as GitHub Actions repository variables:

- `domain_name` / `DOMAIN_NAME`: the existing custom domain managed in WordPress
- `acm_certificate_arn` / `ACM_CERTIFICATE_ARN`: the existing ISSUED ACM
  certificate in `us-east-1`, covering that domain

If your ignored local `terraform.tfvars` still contains ECS settings such as
`container_image`, `app_name`, `container_port`, `desired_count`, or
`ecs_max_capacity`, remove those obsolete entries. The supported variables are
shown in `terraform.tfvars.example`.

The domain and certificate validation record remain unchanged. After the
CloudFront distribution is ready, update the existing WordPress DNS record for
the application hostname to point to Terraform's `cloudfront_domain_name`
output. Do not remove the ACM DNS-validation CNAME.

## Local deployment

Build and validate the frontend:

```sh
npm ci
npm run check
npm run build
```

Set `TF_VAR_domain_name`, `TF_VAR_acm_certificate_arn`, and `AWS_PROFILE`, then
initialize Terraform and inspect the plan:

```sh
cd terraform
terraform init
terraform plan
```

For a one-time migration from the old ECS state, review the plan and run
`terraform destroy` before creating the static-site stack. This interrupts the
site until CloudFront is ready and the WordPress DNS record points to it. This
destroy has already been completed in the current environment; do not repeat it
after the S3/CloudFront resources have been created.

```sh
terraform destroy
terraform apply
terraform apply
aws s3 sync ../dist/ "s3://$(terraform output -raw site_bucket_name)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform output -raw cloudfront_distribution_id)" \
  --paths "/*"
terraform output application_url
terraform output cloudfront_domain_name
```

CloudFront distribution deployment can take several minutes. Verify the
CloudFront URL before changing the DNS target in WordPress.

## GitHub Actions

The `Deploy static site to AWS` workflow checks JavaScript syntax, builds the
site, plans Terraform on same-repository pull requests, and deploys on pushes to
`main`. Configure:

- Repository variables: `DOMAIN_NAME`, `ACM_CERTIFICATE_ARN`
- Repository secrets: `AWS_TF_PLAN_ROLE_TO_ASSUME`,
  `AWS_TF_APPLY_ROLE_TO_ASSUME`
- The production GitHub Environment should retain its reviewer approval.

Update the two OIDC roles for the new plan/apply scope. The plan role needs
read-only access to the Terraform state and S3/CloudFront resources. The apply
role also needs Terraform-managed S3 and CloudFront create/update/delete
permissions, `s3:PutObject`/`s3:DeleteObject` for the site bucket, and
`cloudfront:CreateInvalidation`. Do not grant public access to the site bucket.
