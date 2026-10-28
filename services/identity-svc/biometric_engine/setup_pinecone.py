"""
Create a Pinecone index for the biometric engine.
SFace produces 128-dimensional embeddings.
"""
from pinecone import Pinecone, ServerlessSpec

API_KEY = "pcsk_3r4BFC_SSeLadGhYbrsiCryAEqEtR8cHEJBU1bQd58cAcMHWAHHykJhEbB6VCwvzRcfaWP"
INDEX_NAME = "identity-vectors"

pc = Pinecone(api_key=API_KEY)

# Check if index already exists
existing = [idx["name"] for idx in pc.list_indexes()]
if INDEX_NAME in existing:
    print(f"Index '{INDEX_NAME}' already exists!")
else:
    print(f"Creating index '{INDEX_NAME}' (128 dims, cosine)...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=128,          # SFace embedding dimension
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1",  # Free tier region
        ),
    )
    print("Index created successfully!")

# Verify
index = pc.Index(INDEX_NAME)
stats = index.describe_index_stats()
print(f"\nIndex stats: {stats}")
print(f"Total vectors: {stats.get('total_vector_count', 0)}")
print(f"\nDone! Your index is ready at https://app.pinecone.io")
