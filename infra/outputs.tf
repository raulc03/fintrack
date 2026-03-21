output "public_ip" {
  value       = aws_eip.fintrack.public_ip
  description = "Elastic IP address of the EC2 instance"
}

output "ssh_command" {
  value       = "ssh -i infra/fintrack-key.pem ec2-user@${aws_eip.fintrack.public_ip}"
  description = "SSH command to connect to the instance"
}

output "app_url" {
  value       = "http://${aws_eip.fintrack.public_ip}"
  description = "Direct HTTP URL (use Cloudflare domain for HTTPS)"
}

output "cloudflare_dns" {
  value       = "Add Cloudflare DNS A record: ${var.domain} → ${aws_eip.fintrack.public_ip} (Proxied)"
  description = "Cloudflare DNS configuration instruction"
}
