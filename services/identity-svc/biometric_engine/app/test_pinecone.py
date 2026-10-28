import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv("d:/IMPORTANT/Hacktahon/DevClash/project2/services/identity-svc/.env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "identity-vectors")

print(f"Testing Pinecone with API Key: {PINECONE_API_KEY[:10]}...")
print(f"Index Name: {PINECONE_INDEX_NAME}")

try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    
    stats = index.describe_index_stats()
    print("\nIndex Stats:")
    print(stats)
    
    # Check specifically for namespaces
    namespaces = stats.get('namespaces', {})
    if not namespaces:
        print("\n[!] No namespaces found in this index.")
    else:
        print(f"\nNamespaces found: {list(namespaces.keys())}")
        for ns, data in namespaces.items():
            print(f" - {ns}: {data['vector_count']} vectors")

except Exception as e:
    print(f"\n[ERROR] Pinecone test failed: {e}")
