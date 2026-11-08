# 🔄 Certificate Rotation Process

**Current Certificate:** `<NEW_CERT_ID>-63e4-46c9-a674-335082b191cd` (NEW - PENDING VALIDATION)  
**Old Certificate:** `<OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f` (REVOKED)  
**Domain:** `svg2png.vuilendi.com`

---

## 📋 Complete Rotation Checklist

### Phase 1: DNS Validation (⏳ YOU ARE HERE)
- [ ] Add CNAME record to Wordpress DNS
- [ ] Verify DNS propagation with `dig`
- [ ] Monitor certificate status (PENDING_VALIDATION → ISSUED)
- [ ] Run `./scripts/monitor-certificate.sh` to wait for ISSUED status

### Phase 2: Terraform Update (⏳ NEXT)
- [ ] Certificate status changed to ISSUED
- [ ] Run `./scripts/update-certificate.sh`
- [ ] Review Terraform plan changes
- [ ] Approve and apply changes

### Phase 3: Verification (⏳ AFTER)
- [ ] Test HTTPS: `curl https://svg2png.vuilendi.com`
- [ ] Verify ECS tasks are still running
- [ ] Check CloudWatch logs for errors

### Phase 4: Cleanup (✅ FINAL)
- [ ] Delete old certificate <OLD_CERT_ID> from AWS ACM

---

## 🚀 Quick Start

### Step 1: Add DNS CNAME Record

**Add this record to Wordpress DNS:**

```
Name:  _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com
Type:  CNAME
Value: _ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws
```

**Verify DNS propagation:**

```bash
dig _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com CNAME +short
# Should return the CNAME value above
```

### Step 2: Monitor Certificate Status

**Run this script to wait for ISSUED status:**

```bash
./scripts/monitor-certificate.sh
# Waits up to 10 minutes for certificate to be ISSUED
# Checks every 30 seconds
```

Or manually check status:

```bash
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Expected progression:
1. `PENDING_VALIDATION` (now)
2. `ISSUED` (after DNS CNAME added, ~5-10 min)

### Step 3: Update Terraform

**Once certificate is ISSUED, run:**

```bash
./scripts/update-certificate.sh
```

This script will:
1. ✅ Verify certificate status
2. 📋 Run `terraform plan`
3. 👀 Show proposed changes (update ALB listener certificate)
4. ❓ Ask for confirmation
5. 🚀 Run `terraform apply`
6. 🧪 Test HTTPS access
7. 📝 Show next steps

Or manually update:

```bash
cd terraform

# Set environment variable
export TF_VAR_acm_certificate_arn="<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd"
export AWS_PROFILE=dev-sso

# Plan and apply
terraform plan
terraform apply
```

### Step 4: Verify HTTPS

**Test the updated certificate:**

```bash
# Test connection
curl -vI https://svg2png.vuilendi.com

# Expected output:
# HTTP/2 200 OK
# * subject: CN=svg2png.vuilendi.com
# * issuer: CN=Amazon

# Or open in browser:
# https://svg2png.vuilendi.com
```

### Step 5: Delete Old Certificate

**After confirming new certificate works, delete the old one:**

```bash
AWS_PROFILE=dev-sso aws acm delete-certificate \
  --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1

# Response: (empty on success)
# If error about "in use", ALB still references it - update ALB listener first
```

---

## 📊 Certificate Details

### New Certificate (Active)
```json
{
  "CertificateArn": "<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd",
  "DomainName": "svg2png.vuilendi.com",
  "SubjectAlternativeNames": ["svg2png.vuilendi.com", "*.svg2png.vuilendi.com"],
  "Status": "PENDING_VALIDATION",
  "ValidationMethod": "DNS",
  "DomainValidationOptions": [
    {
      "DomainName": "svg2png.vuilendi.com",
      "ValidationDomain": "svg2png.vuilendi.com",
      "ResourceRecord": {
        "Name": "_682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com.",
        "Type": "CNAME",
        "Value": "_ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws."
      }
    }
  ]
}
```

### Old Certificate (Revoked)
```
ARN: <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f
Status: IN_USE (attached to ALB listener)
Action: Will be replaced by new certificate
```

---

## 🔍 Verification Commands

### Check Current ALB Listener

```bash
AWS_PROFILE=dev-sso aws elbv2 describe-listeners \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:<ACCOUNT_ID>:loadbalancer/app/svg-to-png-alb/... \
  --region us-east-1 \
  --query 'Listeners[?Protocol==`HTTPS`].CertificateArns' \
  --output text
```

### Check Certificate Validation Status

```bash
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd \
  --region us-east-1 \
  --output json | grep -A 20 "DomainValidationOptions"
```

### Monitor ECS After Update

```bash
# Check if tasks are still running
AWS_PROFILE=dev-sso aws ecs describe-services \
  --cluster svg-to-png-cluster \
  --services svg-to-png-service \
  --region us-east-1 \
  --query 'Services[0].{RunningCount:RunningCount, DesiredCount:DesiredCount, Status:Status}'

# View logs
AWS_PROFILE=dev-sso aws logs tail /ecs/svg-to-png --follow
```

---

## ⏱️ Expected Timeline

| Step | Time | Action |
|------|------|--------|
| Add CNAME | Now | Add record to Wordpress DNS |
| DNS Propagation | 5-10 min | Wait for DNS to propagate globally |
| Certificate Validation | 5-10 min | ACM validates and issues certificate |
| Terraform Update | 2-5 min | Update ALB listener with new certificate |
| Test & Verify | 1-2 min | Test HTTPS and verify working |
| Old Cert Cleanup | 5 min | Delete old certificate |
| **Total** | **~30 min** | Complete rotation |

---

## ❓ Troubleshooting

### Certificate Stuck in PENDING_VALIDATION

**Symptom:** Certificate status hasn't changed after 15+ minutes

**Solutions:**
1. Verify CNAME record exists: `dig _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com CNAME`
2. Check Wordpress DNS panel - record saved correctly?
3. Wait another 5 minutes for global DNS propagation
4. Try requesting a new certificate and repeat process

### HTTPS Test Shows Certificate Mismatch

**Symptom:** `curl https://svg2png.vuilendi.com` shows old certificate

**Solutions:**
1. Verify Terraform apply completed: `terraform apply`
2. Wait 2-3 minutes for ALB to update
3. Check ALB listener: `aws elbv2 describe-listeners ...`
4. Force ECS task restart: `aws ecs update-service --cluster ... --force-new-deployment`

### Can't Delete Old Certificate

**Symptom:** "Certificate in use" error when deleting <OLD_CERT_ID>

**Solutions:**
1. Verify new certificate is active: `terraform apply` completed
2. Check ALB listener only uses new certificate
3. Wait 1-2 minutes for ALB cache to clear
4. Try deleting again

---

## 🔐 Security Notes

- ✅ Certificate ARN is environment variable only (not in git)
- ✅ Old certificate will be deleted (cannot be reused)
- ✅ No downtime expected (listener replaced gracefully)
- ✅ All traffic encrypted with TLS

---

## 📚 Related Documentation

- [DNS_VALIDATION_GUIDE.md](DNS_VALIDATION_GUIDE.md) - Detailed DNS steps
- [SECURITY_INCIDENT.md](SECURITY_INCIDENT.md) - Why certificate was rotated
- [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) - Deployment overview

---

## 📞 Support

**Issue:** Certificate won't validate  
**Next:** Check [DNS_VALIDATION_GUIDE.md](DNS_VALIDATION_GUIDE.md) troubleshooting section

**Issue:** Terraform apply fails  
**Next:** Check ALB ARN in your environment

**Issue:** HTTPS still shows old certificate  
**Next:** Wait 2-3 minutes and clear browser cache, then retry

---

**Status:** 🟡 IN PROGRESS - Waiting for DNS validation  
**Last Updated:** 2026-11-09  
**Next Step:** Add CNAME record to Wordpress DNS
