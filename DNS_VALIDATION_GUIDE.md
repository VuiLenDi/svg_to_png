# 🔐 DNS Validation Guide - Certificate Rotation

**Status:** ⏳ PENDING  
**Certificate ARN:** `<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd`  
**Domain:** `svg2png.vuilendi.com`  
**Validation Method:** DNS CNAME

---

## 📋 Action Required: Add DNS CNAME Record

To complete the certificate validation, you must add the following CNAME record to your Wordpress DNS settings:

### DNS Record Details

| Field | Value |
|-------|-------|
| **Name** | `_682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com` |
| **Type** | CNAME |
| **Value** | `_ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws` |
| **TTL** | 300 (or default) |

### Steps to Add CNAME Record

1. **Login to Wordpress DNS management** (or your DNS provider)
2. **Go to DNS Records** section
3. **Click "Add Record"** and select **CNAME** type
4. **Fill in the fields:**
   - Name: `_682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com`
   - Value: `_ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws`
   - TTL: 300 (default is fine)
5. **Save the record**
6. **Wait 5-10 minutes** for DNS propagation

### Verify DNS Propagation

Once you've added the CNAME record, verify that it's propagated:

```bash
# Check if CNAME record exists
dig _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com CNAME +short

# Should return:
# _ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws.
```

### Check Certificate Status

After DNS CNAME is added, check certificate status:

```bash
AWS_PROFILE=dev-sso aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Expected progression:
1. `PENDING_VALIDATION` → (after DNS CNAME added)
2. `ISSUED` → (after ~5-10 minutes)

## 🔄 Update Terraform After Validation

Once certificate status is **ISSUED**, update Terraform:

### Step 1: Set Environment Variable

```bash
export TF_VAR_acm_certificate_arn="<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd"
```

### Step 2: Plan Changes

```bash
cd terraform
AWS_PROFILE=dev-sso terraform plan
```

Expected output:
```
aws_lb_listener.https[0] will be updated in-place:
  ~ certificate_arn: (old cert ARN) → (new cert ARN)
```

### Step 3: Apply Changes

```bash
AWS_PROFILE=dev-sso terraform apply -auto-approve
```

### Step 4: Verify HTTPS

Test HTTPS access:

```bash
curl -vI https://svg2png.vuilendi.com

# Expected output:
# HTTP/2 200 OK
# * subject: CN=svg2png.vuilendi.com
# * issuer: CN=Amazon; ...
# * certificate valid from [date] to [date]
```

## 🧹 Cleanup Old Certificate (After New Cert is Live)

Once the new certificate is active and working, delete the old certificate:

```bash
# ⚠️ Only run AFTER confirming new certificate is working!
AWS_PROFILE=dev-sso aws acm delete-certificate \
  --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f \
  --region us-east-1
```

This will only work if the old certificate is no longer in use.

## 📝 Certificate Timeline

| Step | Status | Action |
|------|--------|--------|
| 1. Request | ✅ DONE | Certificate requested with ID: <NEW_CERT_ID> |
| 2. DNS Validation | ⏳ PENDING | Add CNAME record (you are here) |
| 3. Validation Check | ⏳ PENDING | Wait 5-10 min for certificate status to change to ISSUED |
| 4. Terraform Update | ⏳ PENDING | Update certificate ARN and apply |
| 5. Verification | ⏳ PENDING | Test HTTPS access |
| 6. Cleanup | ⏳ PENDING | Delete old certificate <OLD_CERT_ID> |

## 🚀 Automation (Optional)

If AWS CLI is available, you can automate the verification check:

```bash
#!/bin/bash
CERT_ARN="<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd"
TIMEOUT=600  # 10 minutes

echo "Waiting for certificate to be ISSUED..."
start_time=$(date +%s)

while true; do
  STATUS=$(AWS_PROFILE=dev-sso aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text)
  
  echo "Certificate Status: $STATUS"
  
  if [ "$STATUS" = "ISSUED" ]; then
    echo "✅ Certificate is now ISSUED!"
    break
  fi
  
  current_time=$(date +%s)
  elapsed=$((current_time - start_time))
  
  if [ $elapsed -gt $TIMEOUT ]; then
    echo "❌ Timeout: Certificate validation took too long"
    exit 1
  fi
  
  echo "Waiting... ($elapsed/$TIMEOUT seconds)"
  sleep 30
done
```

## ❓ Troubleshooting

### CNAME Record Not Found

If `dig` returns nothing:
1. Check spelling of record name
2. Check that TTL has expired (usually 5-10 min)
3. Try `nslookup` instead: `nslookup _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com`
4. Check Wordpress DNS panel to confirm record was saved

### Certificate Still PENDING After 30 Minutes

1. Verify CNAME record was added correctly
2. Check record propagation: `dig <name> CNAME`
3. Contact AWS Support (certificate may have issue)

### ALB Still Using Old Certificate

After updating certificate ARN in Terraform:
1. Run `terraform apply` to update ALB listener
2. Wait 1-2 minutes for ALB to update
3. Test with: `curl https://svg2png.vuilendi.com`

---

## 📞 Next Steps Summary

1. ✅ **Now:** Add CNAME record to Wordpress DNS
2. ⏳ **5-10 min:** Wait for DNS propagation
3. ⏳ **5-10 min:** Certificate status changes to ISSUED
4. ⏳ **Soon:** Update Terraform with new certificate ARN
5. ⏳ **Soon:** Test HTTPS access
6. ⏳ **Later:** Delete old certificate

**Estimated Total Time:** 15-30 minutes

---

**Need Help?** See [SECURITY_INCIDENT.md](SECURITY_INCIDENT.md) for context on certificate rotation.
