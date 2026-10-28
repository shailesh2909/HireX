import os
import numpy as np
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv("d:/IMPORTANT/Hacktahon/DevClash/project2/services/identity-svc/.env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "identity-vectors")

print(f"Testing Pinecone Write...")

try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    
    test_id = "test-vector-" + str(np.random.randint(1000, 9999))
    test_values = np.random.normal(0, 1, 128).tolist()
    
    print(f"Attempting to upsert to 'test-ns'...")
    index.upsert(
        vectors=[{"id": test_id, "values": test_values, "metadata": {"test": True}}],
        namespace="test-ns"
    )
    print("Upsert successful!")
    
    print("Verifying fetch...")
    res = index.fetch(ids=[test_id], namespace="test-ns")
    if test_id in res.get('vectors', {}):
        print("Fetch successful! Vector exists.")
    else:
        print("Fetch failed. Vector not found after upsert.")

    # Clean up
    index.delete(ids=[test_id], namespace="test-ns")
    print("Cleaned up test vector.")

except Exception as e:
    print(f"\n[ERROR] Pinecone write test failed: {e}")
