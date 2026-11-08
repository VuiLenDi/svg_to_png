#!/bin/bash

# Update Terraform with new certificate
# Runs after certificate is ISSUED

set -e

CERT_ARN="${1:-<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd}"
REGION="${AWS_REGION:-us-east-1}"
PROFILE="${AWS_PROFILE:-dev-sso}"

echo "🔄 Terraform Certificate Update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Certificate ARN: $CERT_ARN"
echo ""

# Verify certificate is ISSUED
echo "🔍 Verifying certificate status..."
STATUS=$(AWS_PROFILE=$PROFILE aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.Status' \
  --output text)

if [ "$STATUS" != "ISSUED" ]; then
  echo "❌ Certificate is not ISSUED yet (Status: $STATUS)"
  echo "Please wait for DNS validation to complete"
  exit 1
fi

echo "✅ Certificate status: $STATUS"
echo ""

# Set environment variable for Terraform
echo "📝 Setting Terraform variable..."
export TF_VAR_acm_certificate_arn="$CERT_ARN"
export AWS_PROFILE=$PROFILE

# Go to terraform directory
cd terraform

# Plan changes
echo "📋 Running Terraform plan..."
terraform plan -out=tfplan

# Confirm before applying
echo ""
echo "⚠️  Review the plan above"
read -p "Apply changes? (yes/no) " -n 3 -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "🚀 Applying Terraform changes..."
  terraform apply tfplan
  
  echo ""
  echo "✅ Terraform applied successfully!"
  echo ""
  echo "🧪 Testing HTTPS..."
  sleep 5
  
  if curl -s -I https://svg2png.vuilendi.com | head -n 1; then
    echo ""
    echo "✅ HTTPS is working!"
    echo ""
    echo "🎉 Certificate rotation complete!"
    echo ""
    echo "Next: Delete old certificate (if no longer in use)"
    echo "  AWS_PROFILE=$PROFILE aws acm delete-certificate \\"
    echo "    --certificate-arn <CERTIFICATE_ARN><OLD_CERT_ID>-05fe-47fa-b8b5-3ad01f54270f"
  else
    echo "❌ HTTPS test failed"
    echo "The certificate may not be fully propagated yet. Try again in a moment."
  fi
else
  echo "❌ Cancelled"
  exit 1
fi

# Cleanup
rm -f tfplan
