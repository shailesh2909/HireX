from typing import Dict, Any

class CompanyRegistryService:
    def __init__(self):
        pass

    async def check_registry(self, company_name: str, tax_id: str, country: str) -> Dict[str, Any]:
        """
        Simulates querying OpenCorporates or UK Companies House to check active status.
        """
        registry_used = "uk_companies_house" if country.upper() == "GB" else "opencorporates"
        
        # Simulated API check
        # In reality, would query the respective API with the tax_id/company_name
        is_active = True
        company_status = "Active"
        
        # Simple simulation: fail if tax_id is suspiciously short
        if len(tax_id) < 5:
            is_active = False
            company_status = "Dissolved"

        passed = is_active
        failure_reason = None if passed else f"Company is not currently Active in {registry_used}. Status: {company_status}"
        
        return {
            "registry_used": registry_used,
            "is_active": is_active,
            "company_status": company_status,
            "passed": passed,
            "failure_reason": failure_reason
        }
