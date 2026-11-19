variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "svg-to-png"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Existing custom domain name managed outside AWS Route 53"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ISSUED ACM certificate ARN in us-east-1 for the custom CloudFront domain"
  type        = string
  default     = ""

  validation {
    condition     = var.domain_name == "" || var.acm_certificate_arn != ""
    error_message = "Set acm_certificate_arn when domain_name is configured."
  }
}
