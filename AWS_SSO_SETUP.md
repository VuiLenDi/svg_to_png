# AWS SSO and Static-Site Deployment

The application is hosted as static files in a private S3 bucket behind
CloudFront. No container, ECR repository, ECS service, or application VPC is
needed. Terraform state remains in the separate S3 backend configured under
`terraform/bootstrap/`.

## Local AWS access

Use the existing AWS SSO profile:

```sh
aws sso login --profile dev-sso
aws sts get-caller-identity --profile dev-sso
```

Set the existing custom domain and ACM certificate values without committing
them:

```sh
export AWS_PROFILE=dev-sso
export TF_VAR_domain_name="<existing-domain>"
export TF_VAR_acm_certificate_arn="<existing-issued-acm-arn-in-us-east-1>"
```

See [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) for the migration and
deployment commands.

## GitHub Actions

GitHub Actions uses OIDC with the existing plan/apply roles. Configure repository
variables `DOMAIN_NAME` and `ACM_CERTIFICATE_ARN`, and secrets
`AWS_TF_PLAN_ROLE_TO_ASSUME` and `AWS_TF_APPLY_ROLE_TO_ASSUME`. Update role
policies for Terraform-managed S3/CloudFront resources and static-site uploads.
Do not add long-lived AWS access keys.

The existing production environment approval should remain enabled. The first
Terraform deployment removes the ECS/ALB/ECR/VPC application stack; review the
plan and coordinate the WordPress DNS target change to CloudFront.

## State bucket

The bootstrap bucket stores Terraform state separately from the static-site
bucket. Do not remove it when decommissioning ECS. See
[terraform/README.md](terraform/README.md).
