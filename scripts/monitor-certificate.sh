#!/bin/bash

# Certificate Status Monitor
# Waits for ACM certificate to be ISSUED

set -e

CERT_ARN="${1:-<CERTIFICATE_ARN><NEW_CERT_ID>-63e4-46c9-a674-335082b191cd}"
REGION="${AWS_REGION:-us-east-1}"
PROFILE="${AWS_PROFILE:-dev-sso}"
TIMEOUT="${2:-600}"  # 10 minutes default
INTERVAL=30  # Check every 30 seconds

echo "🔐 Certificate Status Monitor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Certificate ARN: $CERT_ARN"
echo "Region: $REGION"
echo "Timeout: $TIMEOUT seconds"
echo ""

start_time=$(date +%s)

while true; do
  STATUS=$(AWS_PROFILE=$PROFILE aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --region "$REGION" \
    --query 'Certificate.Status' \
    --output text 2>/dev/null)
  
  current_time=$(date +%s)
  elapsed=$((current_time - start_time))
  
  # Display progress
  case $STATUS in
    ISSUED)
      echo "✅ Status: $STATUS"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "Certificate is now ISSUED!"
      echo "Elapsed time: ${elapsed}s"
      echo ""
      echo "Next steps:"
      echo "1. Update Terraform with new certificate ARN:"
      echo "   export TF_VAR_acm_certificate_arn=\"$CERT_ARN\""
      echo "2. Run: cd terraform && terraform apply"
      echo "3. Test: curl https://svg2png.vuilendi.com"
      exit 0
      ;;
    PENDING_VALIDATION)
      echo "⏳ Status: PENDING_VALIDATION | Elapsed: ${elapsed}s / ${TIMEOUT}s"
      ;;
    FAILED)
      echo "❌ Status: $STATUS"
      echo "Certificate validation failed!"
      exit 1
      ;;
    *)
      echo "❓ Status: $STATUS | Elapsed: ${elapsed}s / ${TIMEOUT}s"
      ;;
  esac
  
  if [ $elapsed -gt $TIMEOUT ]; then
    echo ""
    echo "❌ Timeout: Certificate validation took longer than ${TIMEOUT} seconds"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify CNAME record was added:"
    echo "   dig _682bd0c061a0bf27fd662e0c7a6765ef.svg2png.vuilendi.com CNAME"
    echo "2. Check Wordpress DNS panel"
    echo "3. Wait a bit more and try again"
    exit 1
  fi
  
  sleep $INTERVAL
done
