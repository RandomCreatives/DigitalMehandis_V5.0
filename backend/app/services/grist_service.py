import httpx
import logging
from typing import List, Dict, Any, Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class GristService:
    """
    Service to interact with Grist-core REST API.
    Handles document lifecycle and data synchronization.
    """

    def __init__(self):
        # In Docker, 'grist' is the hostname. In local dev, it might be 'localhost'.
        # We'll use the setting if provided, otherwise default to docker hostname.
        self.base_url = f"{settings.GRIST_BASE_URL}/api"
        self.api_key = getattr(settings, "GRIST_API_KEY", "admin")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_doc(self, name: str) -> Optional[str]:
        """
        Creates a new Grist document and returns the docId.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/docs",
                    headers=self.headers,
                    json={"name": name}
                )
                response.raise_for_status()
                doc_id = response.json()

                # Initialize tables
                await self.initialize_qs_tables(doc_id)

                return doc_id
            except Exception as e:
                logger.error(f"Failed to create Grist doc: {e}")
                return None

    async def initialize_qs_tables(self, doc_id: str):
        """
        Initializes the standard QS tables in a new document.
        """
        tables = [
            {
                "id": "Measurements",
                "columns": [
                    {"id": "Label", "type": "Text"},
                    {"id": "Type", "type": "Text"},
                    {"id": "Discipline", "type": "Text"},
                    {"id": "Section", "type": "Text"},
                    {"id": "Category", "type": "Text"},
                    {"id": "Final_Value", "type": "Numeric"},
                    {"id": "Unit", "type": "Text"},
                    {"id": "Multiplier", "type": "Numeric"},
                    {"id": "Created_At", "type": "DateTime"}
                ]
            },
            {
                "id": "BOQ",
                "columns": [
                    {"id": "Item_No", "type": "Text"},
                    {"id": "Description", "type": "Text"},
                    {"id": "Unit", "type": "Text"},
                    {"id": "Quantity", "type": "Numeric"},
                    {"id": "Rate", "type": "Numeric"},
                    {"id": "Amount", "type": "Numeric", "formula": "[ * ]"}
                ]
            }
        ]

        async with httpx.AsyncClient() as client:
            for table in tables:
                try:
                    await client.post(
                        f"{self.base_url}/docs/{doc_id}/tables",
                        headers=self.headers,
                        json={"tables": [table]}
                    )
                except Exception as e:
                    logger.warning(f"Could not create table {table['id']} in Grist: {e}")

    async def add_records(self, doc_id: str, table_id: str, records: List[Dict[str, Any]]):
        """
        Pushes records to a specific Grist table.
        records should be a list of dicts: [{"fields": {"Col1": val, ...}}]
        """
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.base_url}/docs/{doc_id}/tables/{table_id}/records"
                response = await client.post(
                    url,
                    headers=self.headers,
                    json={"records": records}
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Failed to push records to Grist table {table_id}: {e}")
                return None

    def get_doc_embed_url(self, doc_id: str) -> str:
        """
        Returns the URL to embed Grist in an iframe.
        """
        return f"{settings.GRIST_BASE_URL}/doc/{doc_id}"

grist_service = GristService()
