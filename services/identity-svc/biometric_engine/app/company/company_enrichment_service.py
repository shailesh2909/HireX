import httpx
from typing import Dict, Any

def extract_base_domain(domain: str) -> str:
    """
    Naively extracts the base domain from a given domain string.
    E.g. 'user@uk.company.com' -> 'company.com'
    """
    if not domain:
        return ""
    parts = domain.lower().split('.')
    if len(parts) >= 2:
        return f"{parts[-2]}.{parts[-1]}"
    return domain.lower()

class CompanyEnrichmentService:
    def __init__(self, api_key: str = "placeholder_key"):
        self.api_key = api_key
        self.base_url = "https://companyenrichment.abstractapi.com/v1/"

    async def enrich_and_link(self, company_name: str, claimed_domain: str, user_email: str) -> Dict[str, Any]:
        """
        Simulates fetching data from AbstractAPI Company Enrichment API.
        Also implements Ownership Linkage by checking if user_email domain matches official_domain.
        """
        # Simulated API response for demo purposes
        # In reality: httpx.get(f"{self.base_url}?api_key={self.api_key}&domain={claimed_domain}")
        simulated_response = {
            "name": company_name,
            "domain": claimed_domain,
            "headquarters": {
                "city": "San Francisco",
                "country": "USA"
            }
        }
        
        official_domain = simulated_response.get("domain", "")
        headquarters = simulated_response.get("headquarters", {})
        hq_string = f"{headquarters.get('city', '')}, {headquarters.get('country', '')}"
        
        # Ownership Linkage: check email domain against official domain
        email_domain = user_email.split('@')[-1] if '@' in user_email else ""
        
        base_email_domain = extract_base_domain(email_domain)
        base_official_domain = extract_base_domain(official_domain)
        
        domain_match = False
        if base_email_domain and base_official_domain:
            domain_match = (base_email_domain == base_official_domain)
        
        passed = domain_match
        failure_reason = None if passed else "User email domain does not match official company domain."
        
        return {
            "official_domain": official_domain,
            "headquarters": hq_string,
            "domain_match": domain_match,
            "passed": passed,
            "failure_reason": failure_reason
        }
