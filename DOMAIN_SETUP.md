# Domain & HTTPS Setup Guide

## 📋 Current Status

- ✅ **HTTPS Listener**: Configured on port 443 with svg2png.vuilendi.com certificate
- ✅ **HTTP to HTTPS Redirect**: Port 80 → 443 (HTTP 301)
- ✅ **Certificate**: ISSUED for `svg2png.vuilendi.com`
- ✅ **Application**: 2/2 ECS tasks running, responding HTTP/2 200 OK
- ⏳ **DNS**: Awaiting A record pointing to ALB

## 🔗 URL Access

### Available URLs

```bash
# ALB Direct (via DNS name)
https://<ALB-DNS-NAME>
→ HTTP/2 200 OK ✅ (certificate mismatch but accessible)

# Custom Domain (HTTPS ready - pending DNS A record)
https://svg2png.vuilendi.com
→ Will work once DNS A record is added
```

## 📋 Setup Completed

✅ **Certificate**: ISSUED (Status: ISSUED)
✅ **Terraform**: Updated to use new certificate
✅ **ALB Listener**: Port 443 configured with new certificate

## 🛠️ Final Step: Add DNS A Record

### Add A Record to Wordpress DNS

To make domain work, add this DNS record in Wordpress:

| Name | Type | Value |
|------|------|-------|
| `svg2png.vuilendi.com` | A | `<ALB-DNS-NAME>` |

Or if Wordpress supports ALIAS records:
| Name | Type | Value |
|------|------|-------|
| `svg2png.vuilendi.com` | ALIAS | `<ALB-DNS-NAME>` |

### Verify DNS Propagation

```bash
# Check DNS resolution (after adding A record)
nslookup svg2png.vuilendi.com
dig svg2png.vuilendi.com +short

# Check certificate validation
AWS_PROFILE=<YOUR-SSO-PROFILE> aws acm describe-certificate \
  --certificate-arn <ACM-CERTIFICATE-ARN> \
  --region <AWS-REGION> \
  --query 'Certificate.Status' \
  --output text
```

Expected output: `ISSUED`

### Update Terraform with New Certificate

Once certificate is `ISSUED`, update `terraform/terraform.tfvars`:

```hcl
acm_certificate_arn = "<ACM-CERTIFICATE-ARN>"
```

Then deploy:
```bash
cd terraform
AWS_PROFILE=<YOUR-SSO-PROFILE> terraform apply -auto-approve
```

## 🔐 HTTPS Redirect Flow

```
┌─────────────────────┐
│  Client Request     │
│  http://domain.com  │
└──────────────┬──────┘
               │
               v
        ┌─────────────┐
        │  Port 80    │
        │  HTTP ALB   │
        │  Listener   │
        └─────────────┘
               │ Redirect (HTTP 301)
               │ Location: https://domain.com
               v
        ┌─────────────┐
        │  Port 443   │
        │  HTTPS ALB  │
        │  Listener   │
        │ + ACM Cert  │
        └─────────────┘
               │ Forward
               v
        ┌─────────────────────┐
        │ ECS Tasks (2-4)     │
        │ Running Application │
        └─────────────────────┘
```

## 📝 Terraform Update (Completed ✅)

Certificate is now ISSUED and Terraform has been updated to use it:

```bash
cd terraform
AWS_PROFILE=<YOUR-SSO-PROFILE> terraform apply -auto-approve
```

Output:
```
aws_lb_listener.https[0] will be updated in-place:
  ~ certificate_arn: (old cert) → (new svg2png cert)

Apply complete! Resources: 0 added, 1 changed, 0 destroyed.
```

## 🔐 Architecture Overview

```
┌────────────────────────────────────────┐
│         AWS Account                    │
├────────────────────────────────────────┤
│                                        │
│   Wordpress Domain (vuilendi.com)      │
│   └─ svg2png.vuilendi.com              │
│                                        │
│   Application Load Balancer            │
│   ├─ Port 80  → HTTP redirect          │
│   └─ Port 443 → HTTPS (ACM cert)       │
│                                        │
│   ECS Fargate Cluster                  │
│   └─ 2-4 tasks running app             │
│                                        │
│   ECR Repository (Docker images)       │
│   └─ svg-to-png:<version>              │
│                                        │
│   CloudWatch Logs                      │
│   └─ /ecs/svg-to-png                   │
│                                        │
└────────────────────────────────────────┘
```

## ❓ Troubleshooting

### Certificate Status

```bash
AWS_PROFILE=<YOUR-SSO-PROFILE> aws acm describe-certificate \
  --certificate-arn <ACM-CERTIFICATE-ARN> \
  --region <AWS-REGION> \
  --output json | grep -A 5 "Status"
```

### DNS Resolution

```bash
# Check if domain resolves
dig svg2png.vuilendi.com +short

# Should show ALB DNS name
```

### HTTPS Connectivity

```bash
# Test HTTPS with verbose output
curl -vI https://svg2png.vuilendi.com

# Check certificate
openssl s_client -connect svg2png.vuilendi.com:443
```

## 📝 Next Steps

1. ✅ Add DNS A record for svg2png.vuilendi.com
2. ✅ Wait for DNS propagation (~5-10 minutes)
3. ✅ Test HTTPS: `curl https://svg2png.vuilendi.com`
4. ✅ Verify application is accessible

## 🚀 After Domain Setup

Once complete:
- Users access: `https://svg2png.vuilendi.com`
- HTTP automatically redirects to HTTPS
- Traffic encrypted with TLS
- Auto-scaling continues to work (2-4 tasks)
- CloudWatch logs available in real-time

## 📌 Placeholders to Replace

When using this guide, replace:
- `<YOUR-SSO-PROFILE>` - Your AWS SSO profile name
- `<ACM-CERTIFICATE-ARN>` - Your ACM certificate ARN
- `<ALB-DNS-NAME>` - Your ALB DNS name
- `<AWS-REGION>` - Your AWS region (e.g., us-east-1)

