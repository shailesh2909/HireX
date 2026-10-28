"""
Quick script to check what's in the Pinecone account and list indexes/vectors.
"""
from pinecone import Pinecone

API_KEY = "pcsk_3r4BFC_SSeLadGhYbrsiCryAEqEtR8cHEJBU1bQd58cAcMHWAHHykJhEbB6VCwvzRcfaWP"

pc = Pinecone(api_key=API_KEY)

# List all indexes
print("=" * 60)
print("PINECONE INDEXES")
print("=" * 60)
indexes = pc.list_indexes()
print(f"Found {len(indexes)} index(es):\n")

for idx_info in indexes:
    name = idx_info["name"]
    print(f"  Index: {name}")
    print(f"  Host:  {idx_info.get('host', 'N/A')}")
    print(f"  Dimension: {idx_info.get('dimension', 'N/A')}")
    print(f"  Metric: {idx_info.get('metric', 'N/A')}")
    print()

    # Connect to the index and get stats
    try:
        index = pc.Index(name)
        stats = index.describe_index_stats()
        print(f"  Stats: {stats}")
        total = stats.get("total_vector_count", 0)
        print(f"  Total vectors: {total}")

        if total > 0 and total <= 100:
            # List some vector IDs (Pinecone doesn't have a "list all" but we can query with a zero vector)
            dim = stats.get("dimension", 128)
            # Use list endpoint if available
            try:
                listed = index.list(limit=100)
                print(f"\n  Vector IDs:")
                for vid in listed.get("vectors", []):
                    print(f"    - {vid}")
            except Exception:
                print("  (Cannot list individual vector IDs — use Pinecone dashboard)")
        print()
    except Exception as e:
        print(f"  Error connecting to index: {e}\n")

print("=" * 60)
print("Done. Visit https://app.pinecone.io to manage via dashboard.")
print("=" * 60)
