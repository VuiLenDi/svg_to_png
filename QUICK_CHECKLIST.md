# Static-Site Migration Checklist

- [ ] Confirm the existing custom domain and its ISSUED ACM certificate in
      `us-east-1`.
- [ ] Configure `DOMAIN_NAME`, `ACM_CERTIFICATE_ARN`, and GitHub OIDC role
      values.
- [ ] Review the Terraform plan; it removes the ECS, ALB, ECR, and VPC
      application resources and creates S3/CloudFront.
- [ ] Deploy and verify the site using the CloudFront distribution domain.
- [ ] Update only the application DNS target in WordPress to the CloudFront
      domain; keep the custom hostname and ACM validation CNAME.
- [ ] Verify HTTPS using the existing custom domain.
- [ ] Confirm the old ECS resources are removed; keep the Terraform state
      backend bucket.

See [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) for exact commands.
