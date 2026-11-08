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
https://svg-to-png-alb-1323256632.us-east-1.elb.amazonaws.com
→ HTTP/2 200 OK ✅ (certificate mismatch but accessible)

# Custom Domain (HTTPS ready - pending DNS A record)
https://svg2png.vuilendi.com
→ Will work once DNS A record is added
```

## 📋 Setup Completed

✅ **Certificate**: ISSUED (Status: ISSUED)
✅ **ACM ARN**: `<CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f`
✅ **Terraform**: Updated to use new certificate
✅ **ALB Listener**: Port 443 configured with new certificate

## 🛠️ Final Step: Add DNS A Record

### Add A Record to Wordpress DNS

To make domain work, add this DNS record in Wordpress:

| Name | Type | Value |
|------|------|-------|
| `svg2png.vuilendi.com` | A | `svg-to-png-alb-1323256632.us-east-1.elb.amazonaws.com` |

Or if Wordpress supports ALIAS records:
| Name | Type | Value |
|------|------|-------|
| `svg2png.vuilendi.com` | ALIAS | `svg-to-png-alb-1323256632.us-east-1.elb.amazonaws.com` |

### Verify DNS Propagation

```bash
# Check DNS resolution (after adding A record)
nslookup svg2png.vuilendi.com
dig svg2png.vuilendi.com +short

# Check certificate validation (allow ~5-10 minutes for ACM to verify)
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Expected output: `ISSUED`

### Step 4: Update Terraform with New Certificate

Once certificate is `ISSUED`, update `terraform/terraform.tfvars`:

```hcl
acm_certificate_arn = "<CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f"
```

Then deploy:
```bash
cd terraform
AWS_PROFILE=dev-sso terraform apply -auto-approve
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
AWS_PROFILE=dev-sso terraform apply -auto-approve
```

Output:
```
aws_lb_listener.https[0] will be updated in-place:
  ~ certificate_arn: (old editimg cert) → (new svg2png cert)

Apply complete! Resources: 0 added, 1 changed, 0 destroyed.
```

## 🔐 HTTPS Security

```
┌────────────────────────────────────────┐
│         AWS Account (dev-sso)          │
├────────────────────────────────────────┤
│                                        │
│   Wordpress Domain (vuilendi.com)      │
│   └─ svg2png.vuilendi.com (CNAME)      │
│                                        │
│   Application Load Balancer            │
│   ├─ Port 80  → HTTP redirect          │
│   └─ Port 443 → HTTPS (ACM cert)       │
│                                        │
│   ECS Fargate Cluster                  │
│   └─ 2-4 tasks running app             │
│                                        │
│   ECR Repository (Docker images)       │
│   └─ svg-to-png:latest                 │
│                                        │
│   CloudWatch Logs                      │
│   └─ /ecs/svg-to-png                   │
│                                        │
└────────────────────────────────────────┘
```

## ❓ Troubleshooting

### Certificate Status

```bash
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1 \
  --output json | jq '.Certificate | {Status, ValidationOptions}'
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

1. ✅ Add CNAME records to Wordpress for ACM validation
2. ✅ Wait for certificate to be `ISSUED` (5-10 minutes)
3. ✅ Update terraform.tfvars with new certificate ARN
4. ✅ Run `terraform apply`
5. ✅ Test HTTPS: `curl https://svg2png.vuilendi.com`

## 🚀 After Domain Setup

Once complete:
- Users access: `https://svg2png.vuilendi.com`
- HTTP automatically redirects to HTTPS
- Traffic encrypted with TLS
- Auto-scaling continues to work (2-4 tasks)
- CloudWatch logs available in real-time
