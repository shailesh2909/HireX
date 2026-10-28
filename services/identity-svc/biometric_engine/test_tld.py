import tldextract

def get_parent_domain(input_str):
    # Extracts the registered domain regardless of subdomains or email prefixes
    ext = tldextract.extract(input_str.split('@')[-1])
    return f"{ext.domain}.{ext.suffix}".lower()

# Test Cases
test_data = [
    ("hr@india.tcs.com", "tcs.com"),          # Regional Subdomain
    ("admin@dev.google.com", "google.com"),    # Infrastructure Subdomain
    ("user@sub.acme.co.uk", "acme.co.uk"),    # Complex Suffix (.co.uk)
    ("fake@google.com.phish.tv", "phish.tv")   # Fraudulent/Look-alike (Should NOT match google.com)
]

for email, claimed in test_data:
    match = get_parent_domain(email) == get_parent_domain(claimed)
    print(f"Testing: {email:25} -> Match: {str(match):5} | Detected Parent: {get_parent_domain(email)}")
