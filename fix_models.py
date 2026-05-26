import re

with open("backend/app/db/models_cost.py", "r") as f:
    content = f.read()

# Fix the misplaced parent_id and add children relationship
pattern = r'class RateItem\(Base\):\s+parent_id: Mapped\[uuid\.UUID \| None\] = mapped_column\(\s+UUID\(as_uuid=True\), ForeignKey\("rate_items\.id", ondelete="CASCADE"\), nullable=True\s+\)\s+__tablename__ = "rate_items"'
replacement = 'class RateItem(Base):\n    __tablename__ = "rate_items"\n\n    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n    parent_id: Mapped[uuid.UUID | None] = mapped_column(\n        UUID(as_uuid=True), ForeignKey("rate_items.id", ondelete="CASCADE"), nullable=True\n    )'

content = re.sub(pattern, replacement, content)

# Remove the duplicated 'id' line if any
content = content.replace('    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n    id:', '    id:')

# Add children relationship
if 'children: Mapped[list["RateItem"]]' not in content:
    content = content.replace(
        'rate_source: Mapped["RateSource"] = relationship("RateSource", back_populates="rate_items")',
        'rate_source: Mapped["RateSource"] = relationship("RateSource", back_populates="rate_items")\n    parent: Mapped["RateItem | None"] = relationship("RateItem", remote_side=[id], back_populates="children")\n    children: Mapped[list["RateItem"]] = relationship("RateItem", back_populates="parent", cascade="all, delete-orphan")'
    )

with open("backend/app/db/models_cost.py", "w") as f:
    f.write(content)
