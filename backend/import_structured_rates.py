import asyncio
import os
import uuid
import sys
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

sys.path.append(os.getcwd())

from app.db.models_cost import RateSource, RateItem
from app.utils.structured_importer import StructuredRateImporter
from app.core.config import get_settings

async def import_all():
    importer = StructuredRateImporter()
    attachments_dir = "../attachments"

    url = "postgresql+asyncpg://neondb_owner:npg_o8EAZmRnsj5k@ep-old-wildflower-aje21rdq-pooler.c-3.us-east-2.aws.neon.tech/neondb"
    engine = create_async_engine(url, connect_args={"ssl": True})
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        title = "MoWUD Structured Cost Data 2018 3rd Quarter"
        stmt = select(RateSource).where(RateSource.title == title)
        result = await db.execute(stmt)
        source = result.scalar_one_or_none()

        if not source:
            source = RateSource(
                title=title,
                issuing_authority="Addis Ababa City Administration",
                region="Addis Ababa",
                fiscal_year="2018",
                quarter="3",
                calendar_system="GC",
                notes="Imported from user-provided JSON/CSV structured files"
            )
            db.add(source)
            await db.commit()
            await db.refresh(source)
            print(f"Created new RateSource: {source.id}")
        else:
            print(f"Using existing RateSource: {source.id}")

        all_items = importer.process_directory(attachments_dir)
        print(f"Total items parsed: {len(all_items)}")

        db_items = {}
        new_count = 0

        for item in all_items:
            raw_no = item.get("item_no")
            clean_no = None
            if raw_no and str(raw_no) != "None":
                clean_no = str(raw_no).replace(" ", "").replace("l", "1").replace("I", "1").rstrip(".")

            key = clean_no if clean_no else f"desc_{hash(item['description'] + item.get('sub_category', ''))}"

            if key in db_items:
                continue

            ri = RateItem(
                rate_source_id=source.id,
                item_no=clean_no,
                description=item["description"],
                unit=item["unit"],
                direct_cost=item["direct_cost"],
                sub_category=item.get("sub_category"),
                confidence=1.0
            )
            db.add(ri)
            db_items[key] = ri
            new_count += 1

        await db.flush()

        link_count = 0
        for key, ri in db_items.items():
            item_no = ri.item_no
            if item_no and "." in item_no:
                parent_no = ".".join(item_no.split(".")[:-1])
                if parent_no in db_items:
                    ri.parent_id = db_items[parent_no].id
                    link_count += 1

        await db.commit()
        print(f"Import complete. Ingested {new_count} items. Linked {link_count} items.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(import_all())
