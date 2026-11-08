# ✅ Quick Reference Checklist

## 🔐 DNS VALIDATION RECORD (ADD THIS FIRST!)

```
Name:  _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com
Type:  CNAME
Value: _ff0c3dfa66bb9c6f481a0980af26abd1.wzccmgtwzk.acm-validations.aws
```

**Verify:** `dig _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com CNAME`

---

## 🎯 5-STEP CHECKLIST

- [ ] **STEP 1:** Add DNS CNAME record above to Wordpress DNS
- [ ] **STEP 2:** Run `./scripts/monitor-certificate.sh` (wait for ISSUED)
- [ ] **STEP 3:** Run `./scripts/update-certificate.sh` (confirms + applies)
- [ ] **STEP 4:** Test HTTPS: `curl -vI https://svg2png.vuilendi.com`
- [ ] **STEP 5:** Delete old cert: `aws acm delete-certificate --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-...`

**⏱️ Total Time:** ~20 minutes

---

## 📚 DOCUMENTATION

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Complete guide
- **[CERTIFICATE_ROTATION.md](CERTIFICATE_ROTATION.md)** - Detailed workflow
- **[DNS_VALIDATION_GUIDE.md](DNS_VALIDATION_GUIDE.md)** - DNS steps
- **[SECURITY_INCIDENT.md](SECURITY_INCIDENT.md)** - Security context

---

## 🔧 AUTOMATION SCRIPTS

**Monitor Certificate Status:**
```bash
./scripts/monitor-certificate.sh
```
- Waits for PENDING_VALIDATION → ISSUED
- Auto-exits when certificate is ready

**Update Terraform:**
```bash
./scripts/update-certificate.sh
```
- Verifies certificate is ISSUED
- Shows Terraform plan
- Applies changes to ALB
- Tests HTTPS

---

## 🔐 Certificate Details

| Field | Value |
|-------|-------|
| **Old ARN** | `<CERTIFICATE_ARN><OLD_CERT_ID>-...` |
| **New ARN** | `<CERTIFICATE_ARN><NEW_CERT_ID>-...` |
| **Domain** | `svg2png.vuilendi.com` |
| **Status** | PENDING_VALIDATION → ISSUED |
| **Validation** | DNS CNAME (required) |

---

## ✨ YOU'RE READY! 

👉 **Next:** Add DNS CNAME record and run monitor script
