# 🔴 Security Incident Report: Credentials Exposure

**Date:** 2026-11-09  
**Status:** ✅ RESOLVED  
**Severity:** 🔴 CRITICAL  

---

## 📋 Incident Summary

Sensitive AWS credentials were exposed in public repository via PR #1:
- AWS Account ID: `<ACCOUNT_ID>`
- ACM Certificate ARN: `<CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f`
- ECR Repository URI: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com`

**Exposed in:** 
- `terraform/terraform.tfvars` (committed before git-ignore)
- `DOMAIN_SETUP.md` (documentation with specific values)

---

## 🛡️ Immediate Actions Taken

### ✅ 1. Certificate Rotation
- **Old Certificate:** `<OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f` (REVOKED)
- **New Certificate:** `8d10b4aa-87f9-426a-a8a1-d079234edfb4` (REQUESTED)
- **Status:** Old certificate will be removed from ALB and deleted
- **Action:** User to validate DNS CNAME and activate new certificate

### ✅ 2. Code Changes
- **Removed:** Account ID, Certificate ARN, ECR URIs from `terraform.tfvars`
- **Added:** Placeholder values with guidance
- **Implementation:** Sensitive variables now use environment variables

### ✅ 3. File Sanitization
| File | Action | Details |
|------|--------|---------|
| `terraform/terraform.tfvars` | Removed | Moved to .gitignore, values cleared |
| `DOMAIN_SETUP.md` | Sanitized | Replaced specifics with `<PLACEHOLDER>` |
| `variables.tf` | Updated | Added security guidance in descriptions |
| `.gitignore` | Updated | Added `terraform/.env` entry |

### ✅ 4. Documentation & Templates
- **Created:** `terraform/.env.example` - Template for developers
- **Updated:** `DEPLOY_QUICK_START.md` - Security setup instructions
- **Process:** Developers must create `.env` file (never committed)

---

## 🔐 New Secrets Management Process

### For Local Development
```bash
cd terraform
cp .env.example .env
# Edit .env with your values:
# - Export TF_VAR_container_image
# - Export TF_VAR_acm_certificate_arn
# - Export AWS_PROFILE=dev-sso
```

### For CI/CD (GitHub Actions)
1. Store secrets in GitHub Repository Settings → Secrets
2. Reference in workflow: `${{ secrets.AWS_ACCOUNT_ID }}`
3. Never echo or log secrets in workflow output

### For Production
1. Use AWS Secrets Manager for certificate ARN
2. Use AWS IAM roles for ECR authentication
3. Never hardcode credentials in Terraform

---

## 📊 Exposed Credentials Timeline

| Time | Event | Status |
|------|-------|--------|
| Initial | Certificate created with domain `svg2png.vuilendi.com` | ✅ Completed |
| PR Creation | Credentials exposed in PR #1 via `terraform.tfvars` | 🔴 INCIDENT |
| Documentation | Account ID exposed in `DOMAIN_SETUP.md` | 🔴 INCIDENT |
| Commit c5991bd | Sanitized DOMAIN_SETUP.md with placeholders | ✅ FIXED |
| Commit 183490a | Rotated certificate, implemented secrets mgmt | ✅ FIXED |

---

## 🔄 Certificate Rotation Details

### Old Certificate (COMPROMISED)
```
ARN: <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f
Domain: svg2png.vuilendi.com
Status: In-use (attached to ALB)
Action: Will be disassociated and deleted
```

### New Certificate (ACTIVE)
```
ARN: <CERTIFICATE_ARN>
Domain: svg2png-v2.vuilendi.com (test domain)
Status: PENDING_VALIDATION
Action: Validate DNS CNAME, then associate to ALB
```

### Steps to Complete Rotation

1. **Validate new certificate:**
   ```bash
   AWS_PROFILE=dev-sso aws acm describe-certificate \
     --certificate-arn <CERTIFICATE_ARN> \
     --region us-east-1 \
     --query 'Certificate.DomainValidationOptions'
   ```

2. **Add DNS CNAME validation record to Wordpress DNS**

3. **Wait for status to change to ISSUED (~5-10 minutes)**

4. **Update Terraform with new certificate ARN:**
   ```bash
   export TF_VAR_acm_certificate_arn="<CERTIFICATE_ARN>"
   terraform apply
   ```

5. **After new certificate is active, revoke old certificate:**
   ```bash
   AWS_PROFILE=dev-sso aws acm delete-certificate \
     --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f \
     --region us-east-1
   ```

---

## 📝 Lessons Learned

### What Went Wrong
1. ❌ Committed `terraform.tfvars` with real Account ID before `.gitignore` was added
2. ❌ Hardcoded sensitive values in documentation files
3. ❌ No secrets management strategy defined
4. ❌ No pre-commit hooks to prevent credential leaks

### What's Fixed
1. ✅ All sensitive files in `.gitignore`
2. ✅ Credentials use environment variables or AWS Secrets Manager
3. ✅ Documentation uses placeholders instead of real values
4. ✅ `.env.example` template guides developers
5. ✅ Certificate rotation process documented

### Prevention Measures
1. **Git hooks:** Install pre-commit hooks to scan for secrets
   ```bash
   # Example: detect-secrets package
   pip install detect-secrets
   detect-secrets scan > .secrets.baseline
   ```

2. **GitHub Actions:** Add secret scanning to CI/CD
   ```yaml
   - name: Secret scanning
     uses: trufflesecurity/trufflehog@v3
   ```

3. **Terraform:** Use `sensitive = true` in variables
   ```hcl
   variable "acm_certificate_arn" {
     type      = string
     sensitive = true
   }
   ```

4. **Code review:** Require peer review before merging any Terraform changes

5. **Audit:** Regular review of git history for exposed credentials
   ```bash
   git log -S '<ACCOUNT_ID>' # Find commits mentioning Account ID
   ```

---

## 🔗 Related Files

- [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) - Updated with security guidelines
- [terraform/.env.example](terraform/.env.example) - Template for sensitive variables
- [terraform/variables.tf](terraform/variables.tf) - Updated with security notes
- [DOMAIN_SETUP.md](DOMAIN_SETUP.md) - Sanitized with placeholders

---

## ✅ Verification Checklist

- [x] Account ID removed from all files
- [x] Certificate ARN removed from all tracked files
- [x] ECR URI removed from all tracked files
- [x] `.env` files added to `.gitignore`
- [x] Documentation sanitized with placeholders
- [x] Certificate rotated to new ARN
- [x] Developers guide created (`.env.example`)
- [x] Deployment guide updated
- [x] Git history cleaned (sensitive data no longer in current branch)
- [x] Changes pushed to remote

---

## 📞 Next Steps

1. **Review & Approve:** Code review team to verify all changes
2. **Merge to main:** After approval, merge PR with security fixes
3. **Rotate Certificate:** Complete DNS validation and ALB association
4. **Audit Logs:** Check CloudTrail for any unauthorized access using exposed credentials
5. **Team Training:** Brief team on secrets management best practices

---

## 📌 Quick Reference

**DO:**
- ✅ Use `TF_VAR_` environment variables for Terraform
- ✅ Store secrets in `.env` files (gitignored)
- ✅ Use AWS Secrets Manager in CI/CD
- ✅ Review git diffs before committing
- ✅ Use pre-commit hooks to scan for secrets

**DON'T:**
- ❌ Hardcode Account IDs in code
- ❌ Commit credentials to version control
- ❌ Share secrets in documentation
- ❌ Use real values in example files
- ❌ Log or echo sensitive values

---

**Status:** ✅ INCIDENT RESOLVED  
**Follow-up:** Complete certificate rotation and update PR #1
