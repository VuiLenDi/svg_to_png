# Domain and HTTPS

The application keeps its existing custom domain and ACM certificate. DNS
remains managed through WordPress; this project does not create Route 53
resources.

## CloudFront requirements

- The existing ACM certificate must be `ISSUED`, cover the custom domain, and
  be in `us-east-1` (CloudFront's certificate region).
- Terraform attaches that certificate to the CloudFront distribution.
- The S3 origin stays private and is accessed through CloudFront OAC.

## DNS cutover

After Terraform creates the distribution and the site is uploaded:

1. Read `cloudfront_domain_name` from Terraform output.
2. In WordPress DNS, keep the existing application hostname and point its
   record to the CloudFront domain. For a subdomain, use a CNAME if the
   WordPress DNS provider supports it.
3. Keep the ACM DNS-validation CNAME unchanged; it is still needed for
   certificate renewal.
4. Wait for DNS propagation and verify `https://<existing-domain>`.

Do not delete the existing ECS/ALB stack before the CloudFront site is verified
and the DNS cutover is ready unless planned downtime is acceptable. See
[DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md).
