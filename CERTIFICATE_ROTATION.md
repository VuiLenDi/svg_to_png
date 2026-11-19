# ACM Certificate for CloudFront

The existing custom domain and ACM certificate are retained for this migration.
CloudFront requires an `ISSUED` ACM certificate in `us-east-1` that covers the
existing application hostname.

## Before deployment

1. Check the existing certificate status and domain names in ACM.
2. Set `TF_VAR_acm_certificate_arn` locally or the GitHub Actions
   `ACM_CERTIFICATE_ARN` variable to that certificate ARN.
3. Keep the existing ACM DNS-validation CNAME in WordPress DNS. It is required
   for certificate renewal.

Do not request or replace a certificate unless the existing one is missing,
expired, or does not cover the hostname.

## After CloudFront is provisioned

Verify the CloudFront URL first. Then update the application hostname's DNS
target in WordPress to the Terraform `cloudfront_domain_name` output. This
changes the routing target, not the domain name or certificate-validation
record. Verify HTTPS at the existing hostname after DNS propagation.

See [DOMAIN_SETUP.md](DOMAIN_SETUP.md) and
[DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md).
