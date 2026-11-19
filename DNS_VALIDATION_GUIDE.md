# DNS and ACM Validation

The existing custom domain remains managed by WordPress. Keep the ACM
certificate's DNS-validation CNAME in place; do not recreate or remove it as
part of the hosting migration.

CloudFront uses the existing ACM certificate, which must be `ISSUED` in
`us-east-1` and cover the custom hostname. After provisioning and verifying
the CloudFront distribution, update the application hostname's DNS target in
WordPress to the Terraform `cloudfront_domain_name` output. The hostname itself
does not change.

For rollout order and validation, see [DOMAIN_SETUP.md](DOMAIN_SETUP.md) and
[DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md).
