# Domain & HTTPS Setup Guide

## 📋 Current Status

- ✅ **HTTPS Listener**: Configured on port 443
- ✅ **HTTP to HTTPS Redirect**: Port 80 → 443 (HTTP 301)
- ⏳ **Certificate**: Awaiting DNS validation for `svg2png.vuilendi.com`
- 🔌 **Temporary Setup**: Using existing validated certificate for testing

## 🔗 URL Access

### Current URLs

```bash
# ALB Direct (HTTP only)
http://svg-to-png-alb-1323256632.us-east-1.elb.amazonaws.com

# Custom Domain (HTTPS ready once DNS validated)
https://svg2png.vuilendi.com
```

## 🛠️ Setup Steps for svg2png.vuilendi.com

### Step 1: Get DNS Validation Records

An ACM certificate has been requested for `svg2png.vuilendi.com`. To validate it, AWS requires DNS CNAME records.

**Certificate ARN**: `arn:aws:acm:us-east-1:086090976189:certificate/90f46806-05fe-47fa-b8b5-3ad01f54270f`

**Check validation status**:
```bash
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:086090976189:certificate/90f46806-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord]' \
  --output json
```

**CNAME Records to Add** (in Wordpress):

| Name | Type | Value |
|------|------|-------|
| `_682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com` | CNAME | `_ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws` |

### Step 2: Add DNS Records to Wordpress

1. Go to Wordpress dashboard → DNS/Domain settings
2. Add the CNAME record above for ACM validation
3. Add `A` record to point domain to ALB:
   ```
   Name: svg2png.vuilendi.com
   Type: A (or ALIAS if supported)
   Value: svg-to-png-alb-1323256632.us-east-1.elb.amazonaws.com
   ```

### Step 3: Verify DNS Propagation

```bash
# Check DNS resolution
nslookup svg2png.vuilendi.com

# Check certificate validation (allow ~5-10 minutes for ACM to verify)
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:086090976189:certificate/90f46806-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Expected output: `ISSUED`

### Step 4: Update Terraform with New Certificate

Once certificate is `ISSUED`, update `terraform/terraform.tfvars`:

```hcl
acm_certificate_arn = "arn:aws:acm:us-east-1:086090976189:certificate/90f46806-05fe-47fa-b8b5-3ad01f54270f"
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

## 🧪 Test HTTPS Setup

Once domain is setup:

```bash
# Test HTTPS connection
curl -I https://svg2png.vuilendi.com

# Expected:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

## 📊 Current Architecture

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
  --certificate-arn arn:aws:acm:us-east-1:086090976189:certificate/90f46806-05fe-47fa-b8b5-3ad01f54270f \
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
